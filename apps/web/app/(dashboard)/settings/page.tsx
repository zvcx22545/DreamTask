'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/uiStore';
import { User, Bell, Shield, Paintbrush, Loader2, Save, Moon, Sun, Eye, EyeOff, Lock, CheckCircle2, XCircle } from 'lucide-react';
import { useTheme } from 'next-themes';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

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
            <Shield className="h-4 w-4" /> เปลี่ยนรหัสผ่าน
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
                    <Image
                      src={avatar || user?.avatar || ''}
                      alt={name || user?.name || ''}
                      width={80}
                      height={80}
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
                    <input type="text" value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://example.com/avatar.jpg" className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
                    <p className="text-xs text-muted-foreground mt-2">ใส่ลิงก์รูปประจำตัว (Avatar URL) ของคุณ</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">ชื่อ-นามสกุล</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">อีเมล</label>
                    <input type="email" defaultValue={user?.email || ''} readOnly className="w-full px-3 py-2 bg-muted/50 border border-border rounded-md text-sm text-muted-foreground cursor-not-allowed" />
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
                        <Sun className="h-8 w-8 text-amber-500" />
                      </div>
                      <p className={`text-sm font-medium text-center ${theme === 'light' ? 'text-primary' : 'text-muted-foreground'}`}>โหมดสว่าง (Light)</p>
                    </div>

                    {/* Dark Mode Button */}
                    <div
                      onClick={() => setTheme('dark')}
                      className={`border-2 rounded-lg p-4 cursor-pointer bg-background transition-all ${theme === 'dark' ? 'border-primary shadow-sm' : 'border-border hover:border-primary/50'}`}
                    >
                      <div className="h-20 bg-slate-900 rounded-md mb-3 flex items-center justify-center border border-slate-800">
                        <Moon className="h-8 w-8 text-blue-400" />
                      </div>
                      <p className={`text-sm font-medium text-center ${theme === 'dark' ? 'text-primary' : 'text-muted-foreground'}`}>โหมดมืด (Dark)</p>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <h2 className="text-xl font-semibold border-b border-border pb-4 mb-6">การแจ้งเตือน</h2>
                <p className="text-sm text-muted-foreground italic">ฟังก์ชันนี้อยู่ระหว่างการพัฒนา (Coming Soon)</p>
              </div>
            )}

            {activeTab === 'security' && (
              <SecurityTab />
            )}

            <div className={`mt-8 pt-6 border-t border-border justify-end ${activeTab === 'security' ? 'hidden' : 'flex'}`}>
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

/** ── Security Tab Component ── */
function SecurityTab() {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [showPass, setShowPass] = useState({ old: false, new: false, confirm: false });

  // Calculate Password Strength (0-4)
  const getStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strength = getStrength(form.newPassword);
  const strengthColor = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500', 'bg-blue-500'][strength];
  const strengthText = ['อ่อนแอมาก', 'อ่อนแอ', 'ปานกลาง', 'แข็งแรง', 'ปลอดภัยสูงสุด'][strength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      return toast({ title: 'รหัสผ่านใหม่ไม่ตรงกัน', variant: 'error' });
    }
    if (form.newPassword.length < 8) {
      return toast({ title: 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร', variant: 'error' });
    }

    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        oldPassword: form.oldPassword,
        newPassword: form.newPassword
      });
      toast({ title: 'เปลี่ยนรหัสผ่านสำเร็จ', variant: 'success' });
      setForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: err.response?.data?.error || 'ไม่สามารถเปลี่ยนรหัสผ่านได้',
        variant: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  if (user?.googleId) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
        <h2 className="text-xl font-semibold border-b border-border pb-4 mb-6">ความปลอดภัย</h2>
        <div className="p-8 rounded-2xl bg-primary/5 border border-primary/10 flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">คุณล็อกอินด้วย Google</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            บัญชีของคุณได้รับการดูแลความปลอดภัยโดย Google คุณไม่จำเป็นต้องตั้งรหัสผ่านแยกต่างหากหากใช้การเข้าสู่ระบบผ่าน Google
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      <h2 className="text-xl font-semibold border-b border-border pb-4 mb-6">เปลี่ยนรหัสผ่าน</h2>

      <form onSubmit={handleSubmit} className="max-w-md space-y-6">
        {/* Old Password */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">รหัสผ่านเดิม</label>
          <div className="relative">
            <input
              type={showPass.old ? "text" : "password"}
              required
              value={form.oldPassword}
              onChange={(e) => setForm(f => ({ ...f, oldPassword: e.target.value }))}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPass(s => ({ ...s, old: !s.old }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPass.old ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">รหัสผ่านใหม่</label>
          <div className="relative">
            <input
              type={showPass.new ? "text" : "password"}
              required
              value={form.newPassword}
              onChange={(e) => setForm(f => ({ ...f, newPassword: e.target.value }))}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPass(s => ({ ...s, new: !s.new }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPass.new ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Strength Indicator */}
          {form.newPassword && (
            <div className="mt-2 space-y-2">
              <div className="flex justify-between text-[10px] uppercase tracking-wider font-bold">
                <span className="text-muted-foreground">ความแข็งแรง:</span>
                <span className={strength === 4 ? 'text-emerald-500' : 'text-primary'}>{strengthText}</span>
              </div>
              <div className="flex gap-1 h-1.5">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={cn(
                      "flex-1 rounded-full transition-all duration-500",
                      strength >= step ? strengthColor : "bg-muted"
                    )}
                  />
                ))}
              </div>
              <ul className="text-[11px] space-y-1">
                <li className={cn("flex items-center gap-2", form.newPassword.length >= 8 ? "text-emerald-500" : "text-muted-foreground")}>
                  {form.newPassword.length >= 8 ? <CheckCircle2 size={12} /> : <XCircle size={12} />} อย่างน้อย 8 ตัวอักษร
                </li>
                <li className={cn("flex items-center gap-2", /[A-Z]/.test(form.newPassword) ? "text-emerald-500" : "text-muted-foreground")}>
                  {/[A-Z]/.test(form.newPassword) ? <CheckCircle2 size={12} /> : <XCircle size={12} />} อักษรตัวพิมพ์ใหญ่
                </li>
                <li className={cn("flex items-center gap-2", /[^A-Za-z0-9]/.test(form.newPassword) ? "text-emerald-500" : "text-muted-foreground")}>
                  {/[^A-Za-z0-9]/.test(form.newPassword) ? <CheckCircle2 size={12} /> : <XCircle size={12} />} สัญลักษณ์พิเศษ
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Confirm New Password */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">ยืนยันรหัสผ่านใหม่</label>
          <div className="relative">
            <input
              type={showPass.confirm ? "text" : "password"}
              required
              value={form.confirmPassword}
              onChange={(e) => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPass(s => ({ ...s, confirm: !s.confirm }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPass.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {form.confirmPassword && form.newPassword !== form.confirmPassword && (
            <p className="text-xs text-red-500 mt-1">รหัสผ่านไม่ตรงกัน</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !form.oldPassword || !form.newPassword || form.newPassword !== form.confirmPassword}
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock size={18} />}
          {loading ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลงรหัสผ่าน'}
        </button>
      </form>
    </div>
  );
}
