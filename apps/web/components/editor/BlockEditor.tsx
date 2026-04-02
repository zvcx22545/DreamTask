'use client'; // บรรทัดนี้บอก Next.js ว่าไฟล์นี้คือฝั่ง Client (ทำงานบนบราวเซอร์ ไม่ใช่บนเซิร์ฟเวอร์)

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';

/**
 * -----------------------------------------------------------------------------
 * 🧩 EditorToolbar Component
 * -----------------------------------------------------------------------------
 * ตัวนี้เราแยกออกมาเขียนเป็น Component ย่อย เพื่อให้โค้ดตรง BlockEditor ดูสะอาดขึ้น
 * หน้าที่ของมันคือส่วนของปุ่ม "แถบเครื่องมือ" ด้านบนนั่นเอง 
 * 
 * @param editor - ตัวแปรที่ใช้ควบคุมความสามารถของ TipTap editor
 */
function EditorToolbar({ editor }: { editor: any }) {
  // ฟังก์ชันช่วยตรวจสอบว่าปุ่มไหนกำลัง "ถูกเลือก" อยู่ไหม (เช่นคลุมดำตัวหนา ปุ่มตัวหนาจะสว่างขึ้น)
  const isDocActive = (name: string) => editor.isActive(name);

  // ปุ่มเปิดปิดสไตล์ต่างๆ (Bold, Italic, Checklist)
  const toggleStyle = (action: () => void) => action();

  return (
    <div className="bg-muted/50 p-2 flex flex-wrap gap-2 border-b border-border shadow-sm">
      {/* 🔹 ปุ่มตัวหนา */}
      <button
        type="button" 
        onClick={() => toggleStyle(() => editor.chain().focus().toggleBold().run())}
        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
          isDocActive('bold') ? 'bg-primary text-primary-foreground shadow' : 'hover:bg-accent'
        }`}
      >
        Bold
      </button>

      {/* 🔹 ปุ่มตัวเอียง */}
      <button
        type="button" 
        onClick={() => toggleStyle(() => editor.chain().focus().toggleItalic().run())}
        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
          isDocActive('italic') ? 'bg-primary text-primary-foreground shadow' : 'hover:bg-accent'
        }`}
      >
        Italic
      </button>

      <div className="w-px bg-border my-1 mx-1" />

      {/* 🔹 ปุ่มสร้าง Checklist */}
      <button
        type="button" 
        onClick={() => toggleStyle(() => editor.chain().focus().toggleTaskList().run())}
        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
          isDocActive('taskList') ? 'bg-primary text-primary-foreground shadow' : 'hover:bg-accent'
        }`}
      >
        Checklist
      </button>

      {/* 🔹 ปุ่มแทรกตาราง */}
      <button
        type="button" 
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        className="px-3 py-1.5 text-xs font-semibold rounded-md hover:bg-accent transition-colors"
      >
        Insert Table
      </button>
      
      {/* 
        เงื่อนไข {editor.isActive('table') && (...)} 
        หมายความว่า "ถ้าเคอร์เซอร์ (Cursor) ของเรากำลังอยู่ในตาราง ให้แสดงปุ่มพวกนี้ขึ้นมา"
      */}
      {editor.isActive('table') && (
        <>
          <div className="w-px bg-border my-1 mx-1" />
          <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()} className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">Add Col</button>
          <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()} className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">Add Row</button>
          <button type="button" onClick={() => editor.chain().focus().deleteColumn().run()} className="px-3 py-1.5 text-xs font-medium rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20">Del Col</button>
          <button type="button" onClick={() => editor.chain().focus().deleteRow().run()} className="px-3 py-1.5 text-xs font-medium rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20">Del Row</button>
          <button type="button" onClick={() => editor.chain().focus().deleteTable().run()} className="px-3 py-1.5 text-xs font-bold rounded-md bg-red-500 text-white hover:bg-red-600">Del Table</button>
        </>
      )}
    </div>
  );
}


/**
 * -----------------------------------------------------------------------------
 * 📝 BlockEditor (Component หลัก)
 * -----------------------------------------------------------------------------
 * นี่คือกล่องข้อความอัจฉริยะ (Rich Text Editor) คล้ายๆ Notion
 * รับ Props เข้ามา 2 ตัวคือ 
 *   1) content: ค่าเริ่มต้นของตาราง (ถ้ามี)
 *   2) onChange: ฟังก์ชันที่จะถูกเรียกเมื่อผู้ใช้พิมพ์ข้อความ (โยน HTML ส่งกลับไป)
 */
export function BlockEditor({ content, onChange }: { content?: string, onChange?: (val: string) => void }) {
  
  // Custom Hook 'useEditor' จากไลบรารี TipTap เพื่อสร้าง Editor instance
  const editor = useEditor({
    extensions: [
      StarterKit, // เครื่องมือพื้นฐาน (ย่อหน้า, ตัวหนา, ตัวเอียง, List)
      Table.configure({ resizable: true }), // Extension สำหรับรองรับโค้ดตาราง
      TableRow, TableHeader, TableCell,
      TaskList, // Extension สำหรับทำ [ ] Checklist (To-Do List)
      TaskItem.configure({ nested: true }),
    ],
    content: content || '', // กำหนดข้อมูลเริ่มต้น
    onUpdate: (props: any) => {
      // ทุกครั้งที่ผู้ใช้พิมพ์ onChange จะทำงาน เพื่ออัพเดตค่ากลับไปยัง Component แม่ (Parent)
      // เราแปลงให้ข้อมูลถูกบันทึกเป็น string (HTML) เพื่อความง่าย
      onChange?.(props.editor.getHTML());
    },
    editorProps: {
      attributes: {
        // Tailwind classes ที่ทำให้หน้าตา editor ดูสวยเหมือน Notion
        // prose ช่วยให้ Typography อัตโนมัติ (เช่น <h1> จะตัวใหญ่ขึ้นเองโดยที่เราไม่ต้องเขียน CSS)
        class: 'prose dark:prose-invert max-w-none focus:outline-none min-h-[150px] p-4 text-sm'
      }
    }
  });

  // ถ้าระบบยังโหลดตัวเลือก Editor ไม่เสร็จ ให้ยังไม่ต้องแสดงอะไรออกไป
  // (ป้องกันบราวเซอร์พัง หรือ Error ที่อ้างอิงถึง editor.xxx ตอนที่ยังเป็น null)
  if (!editor) {
    return null;
  }

  // สิ่งที่เรา Return ออกไปคือ โครงสร้าง HTML ที่ React จะนำไปวาดบนหน้าจอ
  return (
    <div className="border border-border rounded-md overflow-hidden bg-card text-foreground">
      
      {/* 
        เราเรียกใช้ EditorToolbar Component ที่เราแยกไว้ข้างบน 
        พร้อมส่งตัวแปร 'editor' ใส่เข้าไปใน props เพื่อให้ข้างในนั้นเอาไปสั่งการได้
      */}
      <EditorToolbar editor={editor} />
      
      {/* 
        Editor Surface ส่วนพื้นที่สีขาวๆ ที่เอาไว้พิมพ์
        <EditorContent> เป็น Component สำเร็จรูปของ TipTap 
      */}
      <div className="bg-background">
        <EditorContent editor={editor} />
      </div>

    </div>
  );
}
