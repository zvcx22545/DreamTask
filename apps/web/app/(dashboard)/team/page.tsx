'use client';

// นำเข้า hook จาก React เพื่อใช้สร้าง state ภายใน component (เช่น ข้อมูลฟอร์ม)
import { useState } from 'react';
// นำเข้า React Query ใช้สำหรับดึงข้อมูล (useQuery) และส่งข้อมูล (useMutation) โดยจะช่วยเรื่อง Cache และ สถานะ Loading
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// นำเข้า instance ของ API ที่ติดต้ัง Base URL ไว้แล้ว (มักจะเป็น Axios)
import { api } from '@/lib/api';
// นำเข้า Zustand Store เพื่อดึง State ของทีมที่กำลังทำงานอยู่ (Global State)
import { useTeamStore } from '@/store/teamStore';
// นำเข้า Global UI Store เพื่อใช้แสดง Toast แจ้งเตือน และ Dialog ยืนยันการลบ
import { toast, openDialog } from '@/store/uiStore';
// นำเข้า Icon สวยๆ จาก Radix/Lucide
import { Plus, Trash2, Mail, Loader2, Link as LinkIcon } from 'lucide-react';

// ==========================================
// 1. กำหนด Type / Interface เพื่อให้ TypeScript ช่วยเช็คข้อผิดพลาดล่วงหน้า
// ==========================================

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

interface TeamMember {
  id: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  user: User;
}

interface TeamInvite {
  id: string;
  email: string;
  status: string;
  expiresAt: string;
}

interface TeamDetail {
  id: string;
  name: string;
  description: string | null;
  members: TeamMember[];
  invites: TeamInvite[];
}

// ==========================================
// 2. Component หลักของหน้าจัดการทีม
// ==========================================
export default function TeamPage() {
  // ดึงค่า currentTeam จาก Global Store เพื่อดูว่าตอนนี้เลือกทีมไหนอยู่
  const currentTeam = useTeamStore((s) => s.currentTeam);
  
  // สร้าง Query Client เพื่อใช้สั่งให้ React Query อัปเดตข้อมูลใหม่ (Invalidate) หลังจากทำรายการบางอย่างสำเร็จ
  const qc = useQueryClient();
  
  // Local State สำหรับเก็บค่าที่พิมพ์ในช่องกรอกอีเมล
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');

  // --------------------------------------------------------------------------------
  // [A] ดึงข้อมูลทีม (Fetching Data)
  // useQuery ใช้ดึงข้อมูลจาก Server เมื่อข้อมูล currentTeam?.id เปลี่ยน มันจะดึงใหม่เสมอ
  // --------------------------------------------------------------------------------
  const { data: team, isLoading } = useQuery<TeamDetail>({
    queryKey: ['team', currentTeam?.id], // Key สำหรับอ้างอิง Cache ถ้า string นี้เปลี่ยน จะไปดึง API ใหม่
    queryFn: () => api.get(`/teams/${currentTeam?.id}`).then((res) => res.data.team),
    enabled: !!currentTeam?.id, // บอกว่าให้ทำงานต่อเมื่อ currentTeam.id มีค่าเท่านั้น (เพื่อกันบัคตอนโหลดครั้งแรก)
  });

  // --------------------------------------------------------------------------------
  // [B] ฟังก์ชันส่งคำเชิญสมาชิก (Mutation)
  // useMutation ใช้สำหรับการเปลี่ยนแปลงข้อมูลบน Server (POST, PUT, DELETE)
  // --------------------------------------------------------------------------------
  const inviteMutation = useMutation({
    mutationFn: (email: string) => api.post('/invites', { teamId: currentTeam?.id, email }).then((res) => res.data),
    onSuccess: (data) => {
      // เมื่อส่งคำเชิญสำเร็จ ให้ล้างช่องกรอกอีเมล
      setInviteEmail('');
      setInviteLink(data.inviteLink);
      // โชว์ Toast แจ้งเตือนสีเขียว
      toast({ title: 'สร้างคำเชิญสำเร็จ', variant: 'success' });
      // สั่งให้ React Query โหลดข้อมูลทีม (['team', id]) ใหม่ เพื่ออัปเดตรายชื่อ "คำเชิญที่รอดำเนินการ"
      qc.invalidateQueries({ queryKey: ['team', currentTeam?.id] });
    },
    onError: (err: any) => {
      // โชว์ Toast แจ้งเตือนสีแดง เมื่อมี Error ตอบกลับมาจาก Server
      toast({ title: 'เกิดข้อผิดพลาด', description: err.response?.data?.error || 'ไม่สามารถเชิญได้', variant: 'error' });
    }
  });

  // --------------------------------------------------------------------------------
  // [C] ฟังก์ชันลบสมาชิก (Mutation)
  // --------------------------------------------------------------------------------
  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/teams/${currentTeam?.id}/members/${userId}`),
    onSuccess: () => {
      toast({ title: 'ลบสมาชิกเสร็จสิ้น', variant: 'success' });
      // รีเฟรชข้อมูลสมาชิกใหม่
      qc.invalidateQueries({ queryKey: ['team', currentTeam?.id] });
    },
    onError: (err: any) => {
      toast({ title: 'เกิดข้อผิดพลาด', description: err.response?.data?.error || 'ไม่สามารถลบสมาชิกได้', variant: 'error' });
    }
  });

  // ฟังก์ชัน Helper: ไว้เรียกใช้เมื่อกดปุ่ม "ส่งคำเชิญ"
  const handleInvite = () => {
    if (inviteEmail.trim()) {
      inviteMutation.mutate(inviteEmail.trim());
    }
  };

  // ฟังก์ชัน Helper: ไว้เรียกใช้เมื่อกดปุ่ม "ลบ" สมาชิก
  const handleRemoveMember = (userId: string, userName: string) => {
    // ใช้ openDialog จาก UI Store แทน window.alert() ธรรมดา เพื่อความสวยงามกลมกลืนกับแอป
    openDialog({
      title: 'ลบสมาชิกออกจากทีม',
      description: `คุณแน่ใจหรือไม่ว่าต้องการลบ ${userName} ออกจากทีม? การกระทำนี้ไม่สามารถย้อนกลับได้`,
      variant: 'destructive',
      confirmLabel: 'ยืนยันการลบ',
      cancelLabel: 'ยกเลิก',
      onConfirm: () => {
        removeMemberMutation.mutate(userId);
      }
    });
  };

  // --------------------------------------------------------------------------------
  // [D] การแสดงผล (Rendering)
  // --------------------------------------------------------------------------------

  // กรณีที่ยังไม่มีกานเลือกทีมจาก Sidebar ด้านซ้าย (First time login / No teams)
  if (!currentTeam) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 bg-background">
        <div className="text-center text-muted-foreground p-8 border-2 border-dashed border-border rounded-xl">
          โปรดเลือกทีมจากเมนูด้านซ้าย เพื่อจัดการสมาชิก
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-2rem)] bg-background p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">สมาชิกทีม: {currentTeam.name}</h1>
        <p className="mt-1 text-muted-foreground">จัดการสมาชิกและส่งคำเชิญเข้าร่วมทีม</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ฝั่งซ้าย (กินพื้นที่ 2 ส่วน) - แสดงรายชื่อคนในทีม */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card: สมาชิกปัจจุบัน */}
          <div className="rounded-xl border border-border bg-card shadow-sm p-6 relative overflow-hidden">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              สมาชิกปัจจุบัน
            </h2>
            
            {/* แสดง UI โหลดข้อมูล ถ้ากำลัง fetch data */}
            {isLoading ? (
               <div className="flex flex-col items-center justify-center py-8 gap-4">
                 <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 <p className="text-sm text-muted-foreground">กำลังดึงข้อมูลสมาชิก...</p>
               </div>
            ) : (
               <div className="space-y-4">
                 {team?.members.map((m) => (
                   <div key={m.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-background/50 hover:bg-accent/30 transition-colors group">
                     {/* ข้อมูลสมาชิก Avatar + ชื่อ */}
                     <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-blue-500/30 border border-primary/20 flex items-center justify-center text-primary font-bold shadow-sm">
                         {m.user.name.charAt(0).toUpperCase()}
                       </div>
                       <div>
                         <p className="font-semibold text-foreground text-sm">{m.user.name}</p>
                         <p className="text-xs text-muted-foreground mt-0.5">{m.user.email}</p>
                       </div>
                     </div>
                     
                     {/* สถานะ Role + ปุ่มลบ */}
                     <div className="flex items-center gap-4">
                       <span className={`text-[10px] tracking-wider uppercase px-2.5 py-1 rounded-full font-bold ${
                         m.role === 'OWNER' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                         m.role === 'ADMIN' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-muted text-muted-foreground border border-border'
                       }`}>
                         {m.role}
                       </span>
                       <button
                         onClick={() => handleRemoveMember(m.userId, m.user.name)}
                         className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all opacity-50 group-hover:opacity-100"
                         title="ลบสมาชิกลง"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                     </div>
                   </div>
                 ))}
               </div>
            )}
          </div>
          
          {/* Card: คำเชิญที่ถูกส่งไปแล้วรอการตอบรับ (แสดงก็ต่อเมื่อมีข้อมูล) */}
          {team?.invites && team.invites.length > 0 && (
            <div className="rounded-xl border border-border bg-card shadow-sm p-6 overflow-hidden">
              <h2 className="text-lg font-semibold mb-4 text-muted-foreground">คำเชิญที่รอดำเนินการ</h2>
              <div className="space-y-3">
                {team.invites.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between p-3 rounded-md border border-border bg-background/30 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">{inv.email}</span>
                    </div>
                    <span className="text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground">รอผู้ใช้กดรับ...</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ฝั่งขวา (กินพื้นที่ 1 ส่วน) - ฟอร์มกรอกเชิญคนเพิ่ม */}
        <div>
          <div className="rounded-xl border border-border bg-card shadow-sm p-6 sticky top-8">
            <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
              <span className="p-2 bg-primary/10 text-primary rounded-lg">
                <Plus className="w-4 h-4" />
              </span>
              เชิญสมาชิกใหม่
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">ที่อยู่อีเมลผู้รับเชิญ</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleInvite(); }}
                  placeholder="name@example.com"
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground/50"
                  disabled={inviteMutation.isPending}
                />
              </div>
              
              {/* ปุ่มสร้างคำเชิญ โดยปิดการคลิก (disabled) เมื่อช่องว่าง หรือ กำลังโหลด API อยู่ */}
              <button
                onClick={handleInvite}
                disabled={!inviteEmail.trim() || inviteMutation.isPending}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 px-4 rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all shadow-sm active:scale-[0.98]"
              >
                {inviteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'สร้างลิงก์คำเชิญ'}
              </button>

              {/* เมื่อสร้างคำเชิญสำเร็จ จะแสดงผลลิงก์คำเชิญ เพื่อจำลองการส่งเข้าอีเมล */}
              {inviteLink && (
                 <div className="mt-6 p-4 bg-green-500/5 border border-green-500/20 rounded-lg animate-in fade-in slide-in-from-top-2">
                   <p className="text-sm text-green-500 mb-2 font-medium flex items-center gap-1.5">
                     <LinkIcon className="w-4 h-4" /> สร้างลิงก์สำเร็จ!
                   </p>
                   <p className="text-xs text-muted-foreground mb-3">
                     (ระบบทดสอบ: คัดลอกลิงก์ด้านล่างเพื่อเข้าสู่ทีมแทนการเปิดอีเมล)
                   </p>
                   <div className="relative">
                     <input 
                       type="text" 
                       readOnly 
                       value={inviteLink} 
                       className="w-full text-xs p-2.5 pr-10 bg-background border border-border rounded-md text-foreground cursor-text focus:outline-none focus:ring-1 focus:ring-green-500/50"
                       onClick={(e) => e.currentTarget.select()}
                     />
                     <button 
                       onClick={() => {
                         navigator.clipboard.writeText(inviteLink);
                         toast({ title: 'คัดลอกลิงก์แล้ว', variant: 'info' });
                       }}
                       className="absolute right-1 top-1 bottom-1 px-2.5 rounded hover:bg-accent text-xs font-medium text-muted-foreground transition-colors"
                     >
                       Copy
                     </button>
                   </div>
                 </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
