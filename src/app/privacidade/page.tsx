export default function Privacidade() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Politica de Privacidade</h1>
        <p className="text-sm text-slate-500 mb-6">Ultima atualizacao: 14 de marco de 2026</p>

        <div className="space-y-6 text-sm text-slate-600 leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-slate-800 mb-2">1. Dados que coletamos</h2>
            <p>Coletamos apenas os dados necessarios para o funcionamento do servico:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li><strong>Dados de conta:</strong> nome, email e senha (criptografada).</li>
              <li><strong>Dados financeiros:</strong> lancamentos de receitas e despesas que voce registra voluntariamente.</li>
              <li><strong>Dados de membros:</strong> nomes e fotos de membros da familia (opcional).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-800 mb-2">2. Como usamos seus dados</h2>
            <p>Seus dados sao usados exclusivamente para:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Exibir seu dashboard e relatorios financeiros.</li>
              <li>Gerar dicas personalizadas do assistente financeiro.</li>
              <li>Permitir o compartilhamento de dados com membros convidados por voce.</li>
            </ul>
            <p className="mt-2"><strong>Nao vendemos, compartilhamos ou utilizamos seus dados para publicidade.</strong></p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-800 mb-2">3. Armazenamento e seguranca</h2>
            <ul className="list-disc ml-5 space-y-1">
              <li>Seus dados sao armazenados no Supabase (infraestrutura AWS), com criptografia em transito (TLS) e em repouso.</li>
              <li>Senhas sao criptografadas com bcrypt — nem nos temos acesso a elas.</li>
              <li>O acesso ao banco de dados e protegido por Row Level Security (RLS): cada usuario ve apenas seus proprios dados.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-800 mb-2">4. Compartilhamento</h2>
            <p>Voce pode convidar outros emails para acessar sua planilha. O convidado tera acesso aos seus dados financeiros apenas enquanto o convite estiver ativo. Voce pode revogar o acesso a qualquer momento.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-800 mb-2">5. Seus direitos (LGPD)</h2>
            <p>De acordo com a Lei Geral de Protecao de Dados (Lei 13.709/2018), voce tem direito a:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li><strong>Acesso:</strong> visualizar todos os seus dados a qualquer momento no aplicativo.</li>
              <li><strong>Correcao:</strong> editar seus dados pessoais e lancamentos.</li>
              <li><strong>Exclusao:</strong> excluir sua conta e todos os dados permanentemente em Configuracoes &gt; Zona de perigo.</li>
              <li><strong>Portabilidade:</strong> seus dados podem ser exportados.</li>
              <li><strong>Revogacao:</strong> voce pode revogar o consentimento a qualquer momento excluindo sua conta.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-800 mb-2">6. Retencao de dados</h2>
            <p>Seus dados sao mantidos enquanto sua conta estiver ativa. Ao excluir sua conta, todos os dados sao removidos permanentemente e de forma irreversivel em ate 30 dias.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-800 mb-2">7. Contato</h2>
            <p>Para duvidas sobre privacidade ou exercicio de direitos, entre em contato pelo email: <strong>jornalista.mateusfb@gmail.com</strong></p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200">
          <a href="/" className="text-blue-600 text-sm font-semibold hover:text-blue-700">&larr; Voltar ao aplicativo</a>
        </div>
      </div>
    </div>
  );
}
