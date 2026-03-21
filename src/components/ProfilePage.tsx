'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useToast } from './Toast';
import { User, Mail, Phone, MapPin, Briefcase, Calendar, Users } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [city, setCity] = useState('');
  const [occupation, setOccupation] = useState('');
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
      }
      setLoaded(true);
    }
    load();
  }, [user]);

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
        <div className="w-20 h-20 rounded-full t-accent-bg text-white text-2xl font-bold flex items-center justify-center mb-3">
          {initials}
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
