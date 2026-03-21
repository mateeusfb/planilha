export default function Privacidade() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">Política de Privacidade</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Última atualização: 14 de março de 2026</p>

        <div className="space-y-6 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-2">1. Dados que coletamos</h2>
            <p>Coletamos apenas os dados necessários para o funcionamento do serviço:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li><strong>Dados de conta:</strong> nome, email e senha (criptografada).</li>
              <li><strong>Dados financeiros:</strong> lançamentos de receitas e despesas que você registra voluntariamente.</li>
              <li><strong>Dados de membros:</strong> nomes e fotos de membros da família (opcional).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-2">2. Como usamos seus dados</h2>
            <p>Seus dados são usados exclusivamente para:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Exibir seu dashboard e relatórios financeiros.</li>
              <li>Gerar dicas personalizadas do assistente financeiro.</li>
              <li>Permitir o compartilhamento de dados com membros convidados por você.</li>
            </ul>
            <p className="mt-2"><strong>Não vendemos, compartilhamos ou utilizamos seus dados para publicidade.</strong></p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-2">3. Armazenamento e segurança</h2>
            <ul className="list-disc ml-5 space-y-1">
              <li>Seus dados são armazenados no Supabase (infraestrutura AWS), com criptografia em trânsito (TLS) e em repouso.</li>
              <li>Senhas são criptografadas com bcrypt — nem nós temos acesso a elas.</li>
              <li>O acesso ao banco de dados é protegido por Row Level Security (RLS): cada usuário vê apenas seus próprios dados.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-2">4. Compartilhamento</h2>
            <p>Você pode convidar outros emails para acessar sua planilha. O convidado terá acesso aos seus dados financeiros apenas enquanto o convite estiver ativo. Você pode revogar o acesso a qualquer momento.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-2">5. Seus direitos (LGPD)</h2>
            <p>De acordo com a Lei Geral de Proteção de Dados (Lei 13.709/2018), você tem direito a:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li><strong>Acesso:</strong> visualizar todos os seus dados a qualquer momento no aplicativo.</li>
              <li><strong>Correção:</strong> editar seus dados pessoais e lançamentos.</li>
              <li><strong>Exclusão:</strong> excluir sua conta e todos os dados permanentemente em Configurações &gt; Zona de perigo.</li>
              <li><strong>Portabilidade:</strong> seus dados podem ser exportados.</li>
              <li><strong>Revogação:</strong> você pode revogar o consentimento a qualquer momento excluindo sua conta.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-2">6. Retenção de dados</h2>
            <p>Seus dados são mantidos enquanto sua conta estiver ativa. Ao excluir sua conta, todos os dados são removidos permanentemente e de forma irreversível em até 30 dias.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-2">7. Contato</h2>
            <p>Para dúvidas sobre privacidade ou exercício de direitos, entre em contato pelo email: <strong>jornalista.mateusfb@gmail.com</strong></p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
          <a href="/" className="text-blue-600 dark:text-blue-400 text-sm font-semibold hover:text-blue-700 dark:hover:text-blue-300">&larr; Voltar ao aplicativo</a>
        </div>
      </div>
    </div>
  );
}
