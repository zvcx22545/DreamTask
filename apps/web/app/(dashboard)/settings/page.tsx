'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/uiStore';
import { User, Bell, Shield, Paintbrush, Loader2, Save, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const { theme, setTheme } = useTheme();
  
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security' | 'appearance'>('profile');

  // State สำหรับแก้ไขโปรไฟล์
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');

  const handleSave = async () => {
    setIsSaving(true);

    if (activeTab === 'profile') {
      try {
        const { data } = await api.patch('/users/me', { name, avatar });
        updateUser({ name: data.name, avatar: data.avatar });
        toast({ title: 'อัปเดตข้อมูลส่วนตัวสำเร็จ', variant: 'success' });
      } catch (error) {
        toast({ title: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล', variant: 'error' });
      } finally {
        setIsSaving(false);
      }
    } else {
      setTimeout(() => {
        setIsSaving(false);
        toast({ title: 'บันทึกการตั้งค่าสำเร็จ', variant: 'success' });
      }, 1000);
    }
  };

  return (
    <div className="min-h-[calc(100vh-2rem)] bg-background p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">การตั้งค่า (Settings)</h1>
        <p className="mt-1 text-muted-foreground">ปรับแต่งโปรไฟล์และรูปแบบการใช้งานของคุณ</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="md:col-span-1 space-y-1">
          <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}`}>
            <User className="h-4 w-4" /> โปรไฟล์
          </button>
          <button onClick={() => setActiveTab('appearance')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'appearance' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}`}>
            <Paintbrush className="h-4 w-4" /> รูปแบบและธีม
          </button>
          <button onClick={() => setActiveTab('notifications')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'notifications' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}`}>
            <Bell className="h-4 w-4" /> การแจ้งเตือน
          </button>
          <button onClick={() => setActiveTab('security')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'security' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}`}>
            <Shield className="h-4 w-4" /> ความปลอดภัย
          </button>
        </div>

        {/* Content Area */}
        <div className="md:col-span-3">
          <div className="rounded-xl border border-border bg-card shadow-sm p-6 lg:p-8">
            
            {activeTab === 'profile' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <h2 className="text-xl font-semibold border-b border-border pb-4 mb-6">ข้อมูลส่วนตัว</h2>
                <div className="flex items-center gap-6 mb-8">
                  {avatar || user?.avatar ? (
                    <img
                      src={avatar || user?.avatar || ''}
                      alt={name || user?.name || ''}
                      className="w-20 h-20 rounded-full object-cover border-2 border-primary/20 shadow-md"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-blue-500/30 border-2 border-primary/20 flex items-center justify-center text-primary text-2xl font-bold shadow-md">
                      {(name || user?.name)?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <div className="flex-1 w-full max-w-sm">
                    <label className="text-sm font-medium text-foreground mb-1 block">URL รูปประจำตัว</label>
                    <input type="text" value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://example.com/avatar.jpg" className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:ring-2 focus:ring-primary focus:outline-none"/>
                    <p className="text-xs text-muted-foreground mt-2">ใส่ลิงก์รูปประจำตัว (Avatar URL) ของคุณ</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">ชื่อ-นามสกุล</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:ring-2 focus:ring-primary focus:outline-none"/>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">อีเมล</label>
                    <input type="email" defaultValue={user?.email || ''} readOnly className="w-full px-3 py-2 bg-muted/50 border border-border rounded-md text-sm text-muted-foreground cursor-not-allowed"/>
                    <p className="text-xs text-muted-foreground">ไม่สามารถเปลี่ยนอีเมลได้ หากต้องการเปลี่ยนกรุณาติดต่อ Support</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <h2 className="text-xl font-semibold border-b border-border pb-4 mb-6">รูปแบบและธีม</h2>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">เลือกระหว่างโหมดสว่างหรือโหมดมืด</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    
                    {/* Light Mode Button */}
                    <div 
                      onClick={() => setTheme('light')}
                      className={`border-2 rounded-lg p-4 cursor-pointer bg-background transition-all ${theme === 'light' ? 'border-primary shadow-sm' : 'border-border hover:border-primary/50'}`}
                    >
                      <div className="h-20 bg-slate-100 rounded-md mb-3 flex items-center justify-center border border-slate-200">
                        <Sun className="h-8 w-8 text-amber-500"/>
                      </div>
                      <p className={`text-sm font-medium text-center ${theme === 'light' ? 'text-primary' : 'text-muted-foreground'}`}>โหมดสว่าง (Light)</p>
                    </div>

                    {/* Dark Mode Button */}
                    <div 
                      onClick={() => setTheme('dark')}
                      className={`border-2 rounded-lg p-4 cursor-pointer bg-background transition-all ${theme === 'dark' ? 'border-primary shadow-sm' : 'border-border hover:border-primary/50'}`}
                    >
                      <div className="h-20 bg-slate-900 rounded-md mb-3 flex items-center justify-center border border-slate-800">
                        <Moon className="h-8 w-8 text-blue-400"/>
                      </div>
                      <p className={`text-sm font-medium text-center ${theme === 'dark' ? 'text-primary' : 'text-muted-foreground'}`}>โหมดมืด (Dark)</p>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {(activeTab === 'notifications' || activeTab === 'security') && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                 <h2 className="text-xl font-semibold border-b border-border pb-4 mb-6">
                   {activeTab === 'notifications' ? 'การแจ้งเตือน' : 'ความปลอดภัย'}
                 </h2>
                 <p className="text-sm text-muted-foreground italic">ฟังก์ชันนี้อยู่ระหว่างการพัฒนา (Coming Soon)</p>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-border flex justify-end">
              <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-70">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                บันทึกการเปลี่ยนแปลง
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
