'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useToast } from './Toast';
import { User, Mail, Phone, MapPin, Briefcase, Calendar, Users, Camera, Trash2 } from 'lucide-react';

const MAX_SIZE = 300;
const QUALITY = 0.85;

function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > height) {
        if (width > MAX_SIZE) { height = Math.round(height * MAX_SIZE / width); width = MAX_SIZE; }
      } else {
        if (height > MAX_SIZE) { width = Math.round(width * MAX_SIZE / height); height = MAX_SIZE; }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Falha ao comprimir')),
        'image/webp',
        QUALITY,
      );
    };
    img.onerror = () => reject(new Error('Falha ao carregar imagem'));
    img.src = URL.createObjectURL(file);
  });
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [city, setCity] = useState('');
  const [occupation, setOccupation] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const { data } = await supabase.from('user_profiles').select('*').eq('user_id', user!.id).single();
      if (data) {
        setPhone(data.phone || '');
        setGender(data.gender || '');
        setBirthDate(data.birth_date || '');
        setCity(data.city || '');
        setOccupation(data.occupation || '');
        setAvatarUrl(data.avatar_url || null);
      }
      setLoaded(true);
    }
    load();
  }, [user]);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const path = `${user.id}/profile.webp`;
      const { error } = await supabase.storage.from('avatars').upload(path, compressed, {
        contentType: 'image/webp',
        upsert: true,
      });
      if (error) throw error;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = `${data.publicUrl}?t=${Date.now()}`;
      await supabase.from('user_profiles').upsert({
        user_id: user.id,
        avatar_url: url,
        updated_at: new Date().toISOString(),
      });
      setAvatarUrl(url);
      toast('Foto atualizada!', 'success');
    } catch {
      toast('Erro ao enviar foto', 'error');
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function removePhoto() {
    if (!user) return;
    setUploading(true);
    try {
      await supabase.storage.from('avatars').remove([`${user.id}/profile.webp`]);
      await supabase.from('user_profiles').upsert({
        user_id: user.id,
        avatar_url: null,
        updated_at: new Date().toISOString(),
      });
      setAvatarUrl(null);
      toast('Foto removida', 'success');
    } catch {
      toast('Erro ao remover foto', 'error');
    }
    setUploading(false);
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    await supabase.from('user_profiles').upsert({
      user_id: user.id,
      phone: phone.trim() || null,
      gender: gender || null,
      birth_date: birthDate || null,
      city: city.trim() || null,
      occupation: occupation.trim() || null,
      updated_at: new Date().toISOString(),
    });
    toast('Perfil atualizado!', 'success');
    setSaving(false);
  }

  const displayName = user?.user_metadata?.name || 'Usuário';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header do perfil */}
      <div className="t-card border rounded-xl p-6 flex flex-col items-center text-center">
        <div className="relative group mb-3">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Foto de perfil" className="w-24 h-24 rounded-full object-cover border-4 t-border" />
          ) : (
            <div className="w-24 h-24 rounded-full t-accent-bg text-white text-3xl font-bold flex items-center justify-center border-4 t-border">
              {initials}
            </div>
          )}
          <input type="file" ref={fileRef} accept="image/*" onChange={handlePhotoUpload} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full t-accent-bg text-white flex items-center justify-center shadow-lg cursor-pointer hover:opacity-90 transition-opacity border-2 t-border disabled:opacity-50"
            title="Alterar foto"
          >
            {uploading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera size={14} />
            )}
          </button>
          {avatarUrl && (
            <button
              onClick={removePhoto}
              disabled={uploading}
              className="absolute top-0 right-0 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg cursor-pointer hover:opacity-90 transition-opacity opacity-0 group-hover:opacity-100 disabled:opacity-50"
              title="Remover foto"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
        <h2 className="text-xl font-bold t-text">{displayName}</h2>
        <p className="text-sm t-text-dim flex items-center gap-1.5 mt-1">
          <Mail size={14} /> {user?.email}
        </p>
      </div>

      {/* Informações pessoais */}
      <div className="t-card border rounded-xl p-6">
        <h3 className="text-base font-bold t-text mb-1 flex items-center gap-2">
          <User size={18} /> Informações Pessoais
        </h3>
        <p className="text-xs t-text-muted mb-4">Essas informações nos ajudam a personalizar sua experiência.</p>

        {loaded && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold t-text-muted mb-1 flex items-center gap-1.5">
                  <Phone size={13} /> Telefone
                </label>
                <input value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999" type="tel"
                  className="w-full px-3 py-2.5 rounded-lg t-input border text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold t-text-muted mb-1 flex items-center gap-1.5">
                  <Users size={13} /> Gênero
                </label>
                <select value={gender} onChange={e => setGender(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg t-input border text-sm cursor-pointer">
                  <option value="">Selecione...</option>
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                  <option value="outro">Outro</option>
                  <option value="prefiro_nao_dizer">Prefiro não dizer</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold t-text-muted mb-1 flex items-center gap-1.5">
                  <Calendar size={13} /> Data de nascimento
                </label>
                <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg t-input border text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold t-text-muted mb-1 flex items-center gap-1.5">
                  <MapPin size={13} /> Cidade
                </label>
                <input value={city} onChange={e => setCity(e.target.value)}
                  placeholder="Sua cidade"
                  className="w-full px-3 py-2.5 rounded-lg t-input border text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold t-text-muted mb-1 flex items-center gap-1.5">
                <Briefcase size={13} /> Profissão
              </label>
              <input value={occupation} onChange={e => setOccupation(e.target.value)}
                placeholder="Ex: Designer, Programador, Administrador..."
                className="w-full px-3 py-2.5 rounded-lg t-input border text-sm" />
            </div>
            <button onClick={save} disabled={saving}
              className="px-4 py-2 t-accent-bg text-white rounded-lg text-sm font-semibold cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar perfil'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
