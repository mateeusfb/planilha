import type { Expense, Member } from './types';
import { fmt, getTotal, groupBy } from './helpers';

export interface Tip {
  type: 'good' | 'info' | 'warn' | 'bad';
  icon: string;
  title: string;
  text: string;
}

export function generateTips(
  expenses: Expense[],
  activeMember: string,
  getIndividualMembers: () => Member[]
): Tip[] {
  const tips: Tip[] = [];
  const outflows = expenses.filter(e => e.type !== 'income');
  const incomes = expenses.filter(e => e.type === 'income');

  const incomesNormais = incomes.filter(e => e.cat !== 'Investimento');
  const incomesInvest = incomes.filter(e => e.cat === 'Investimento');
  const totalIncome = getTotal(incomesNormais);
  const totalIncomeInvest = getTotal(incomesInvest);

  const investSaida = outflows.filter(e => e.cat === 'Investimento').reduce((s, e) => s + e.value, 0);
  const despesasReais = getTotal(outflows) - investSaida;
  const saldoInvest = investSaida + totalIncomeInvest;
  const saldo = totalIncome - despesasReais;

  const base = totalIncome > 0 ? totalIncome : despesasReais;

  const outflowsSemInvest = outflows.filter(e => e.cat !== 'Investimento');
  const byCat = groupBy(outflowsSemInvest, 'cat');
  const byPayment = groupBy(outflowsSemInvest, 'payment');

  if (!expenses.length) {
    tips.push({ type: 'info', icon: 'i', title: 'Comece registrando seus lancamentos', text: 'Adicione receitas e despesas para receber analises personalizadas sobre sua saude financeira.' });
    return tips;
  }

  if (outflows.length === 0 && incomes.length > 0) {
    tips.push({ type: 'info', icon: 'i', title: 'Registre suas despesas', text: 'Voce registrou receitas, mas ainda nao ha despesas. Adicione seus gastos para ver a analise completa.' });
    return tips;
  }

  // SALDO DISPONIVEL
  if (totalIncome > 0) {
    if (saldo < 0) {
      tips.push({ type: 'bad', icon: '!', title: 'Despesas acima da receita!', text: `Suas despesas reais superam a receita em ${fmt(Math.abs(saldo))}. Investimentos nao estao incluidos nessa conta — o problema esta nos gastos do dia a dia.` });
    } else {
      const savePct = Math.round(saldo / totalIncome * 100);
      if (savePct >= 30) {
        tips.push({ type: 'good', icon: 'ok', title: `Excelente! ${savePct}% da receita disponivel`, text: `Voce ainda tem ${fmt(saldo)} livres apos as despesas. Otima margem para aportar em investimentos ou reserva de emergencia.` });
      } else if (savePct >= 10) {
        tips.push({ type: 'info', icon: 'i', title: `Saldo disponivel: ${savePct}% da receita`, text: `Restam ${fmt(saldo)} depois de pagar as contas. Tente chegar a 30% de folga para acelerar seus objetivos financeiros.` });
      } else if (savePct > 0) {
        tips.push({ type: 'warn', icon: '!', title: `Margem apertada: apenas ${savePct}%`, text: `Sobram so ${fmt(saldo)} da receita. Qualquer imprevisto pode estourar o orcamento. Revise gastos para ampliar essa margem.` });
      }
    }
  } else {
    tips.push({ type: 'warn', icon: '!', title: 'Cadastre suas receitas', text: 'Sem receitas registradas o assistente nao consegue calcular percentuais nem avaliar sua saude financeira. Adicione seu salario e outras entradas.' });
  }

  // INVESTIMENTOS
  if (saldoInvest > 0) {
    const investParts: string[] = [];
    if (investSaida > 0) investParts.push(`${fmt(investSaida)} em aportes`);
    if (totalIncomeInvest > 0) investParts.push(`${fmt(totalIncomeInvest)} em rendimentos`);
    const investDetail = investParts.join(' e ');

    if (totalIncome > 0) {
      const investPct = Math.round(investSaida / totalIncome * 100);
      if (investPct >= 20) {
        tips.push({ type: 'good', icon: 'ok', title: `Investidor de peso: ${investPct}% da receita aportada`, text: `Saldo de investimentos este mes: ${fmt(saldoInvest)} (${investDetail}). Voce esta construindo patrimonio de forma solida.` });
      } else if (investPct >= 10) {
        tips.push({ type: 'good', icon: 'ok', title: `Bom ritmo de investimento: ${investPct}%`, text: `Saldo de investimentos: ${fmt(saldoInvest)} (${investDetail}). Para acelerar, tente chegar a 20% da receita em aportes.` });
      } else {
        tips.push({ type: 'info', icon: 'i', title: `Investimentos: ${investPct}% da receita`, text: `Saldo de investimentos: ${fmt(saldoInvest)} (${investDetail}). A meta ideal e direcionar 10-20% da receita para aportes.` });
      }
    } else {
      tips.push({ type: 'info', icon: 'i', title: 'Movimentacao de investimentos', text: `Saldo de investimentos no mes: ${fmt(saldoInvest)} (${investDetail}).` });
    }

    if (totalIncomeInvest > 0 && investSaida > 0) {
      const rendPct = Math.round(totalIncomeInvest / investSaida * 100);
      if (rendPct >= 50) {
        tips.push({ type: 'good', icon: 'ok', title: 'Seus investimentos estao rendendo bem', text: `Os rendimentos representam ${rendPct}% do que voce aportou este mes. O dinheiro esta trabalhando por voce.` });
      }
    }
  } else if (totalIncome > 0) {
    tips.push({ type: 'bad', icon: '!', title: 'Nenhum investimento este mes', text: 'Voce nao registrou aportes nem rendimentos de investimentos. Separe ao menos 10% da receita para construir patrimonio — seu "eu do futuro" agradece.' });
  }

  // MORADIA
  const moradia = byCat['Moradia'] || 0;
  if (moradia > 0 && base > 0) {
    const morPct = Math.round(moradia / base * 100);
    if (morPct > 35) {
      tips.push({ type: 'bad', icon: '!', title: `Moradia: ${morPct}% da receita`, text: `${fmt(moradia)} gastos com moradia. Acima de 30% compromete as demais areas do orcamento. Avalie alternativas para reduzir este custo fixo.` });
    } else if (morPct > 30) {
      tips.push({ type: 'warn', icon: '!', title: `Moradia no limite: ${morPct}%`, text: `${fmt(moradia)} com moradia esta proximo do teto recomendado de 30%. Fique atento a reajustes.` });
    }
  }

  // ALIMENTACAO
  const alimentacao = byCat['Alimentacao'] || 0;
  if (alimentacao > 0 && base > 0) {
    const aliPct = Math.round(alimentacao / base * 100);
    if (aliPct > 25) {
      tips.push({ type: 'warn', icon: '!', title: `Alimentacao: ${aliPct}% da receita`, text: `${fmt(alimentacao)} gastos com alimentacao. O recomendado e manter entre 15-20%. Cozinhar mais em casa e planejar compras pode ajudar.` });
    }
  }

  // TRANSPORTE
  const transporte = byCat['Transporte'] || 0;
  if (transporte > 0 && base > 0) {
    const transPct = Math.round(transporte / base * 100);
    if (transPct > 15) {
      tips.push({ type: 'warn', icon: '!', title: `Transporte pesando: ${transPct}%`, text: `${fmt(transporte)} com transporte. Considere alternativas como carona, transporte publico ou otimizar trajetos.` });
    }
  }

  // LAZER
  const lazer = byCat['Lazer'] || 0;
  if (lazer > 0 && base > 0) {
    const lazPct = Math.round(lazer / base * 100);
    if (lazPct > 15) {
      tips.push({ type: 'warn', icon: '!', title: `Lazer acima do ideal: ${lazPct}%`, text: `${fmt(lazer)} com lazer (recomendado ate 10-15%). Lazer e importante, mas em excesso prejudica as metas financeiras.` });
    } else if (lazPct <= 5 && despesasReais > 500) {
      tips.push({ type: 'info', icon: 'i', title: 'Cuide do seu lazer tambem', text: `Apenas ${lazPct}% com lazer. Equilibrio e importante — nao se esqueca de se recompensar de vez em quando.` });
    }
  }

  // ASSINATURAS
  const assinaturas = byCat['Assinaturas'] || 0;
  if (assinaturas > 0 && base > 0) {
    const assPct = Math.round(assinaturas / base * 100);
    if (assPct > 5) {
      tips.push({ type: 'warn', icon: '!', title: `Assinaturas acumulando: ${assPct}%`, text: `${fmt(assinaturas)} em assinaturas e servicos recorrentes. Revise se esta usando tudo — cancelar o que nao usa pode liberar dinheiro todo mes.` });
    }
  }

  // CARTAO DE CREDITO
  const credito = byPayment['Credito'] || 0;
  if (credito > 0 && despesasReais > 0) {
    const credPct = Math.round(credito / despesasReais * 100);
    if (credPct > 60) {
      tips.push({ type: 'warn', icon: '!', title: `${credPct}% das despesas no credito`, text: `${fmt(credito)} no cartao de credito. Concentrar demais no credito cria uma bola de neve. Prefira debito ou PIX para gastos do dia a dia.` });
    } else if (credPct > 40) {
      tips.push({ type: 'info', icon: 'i', title: `${credPct}% das despesas no credito`, text: `${fmt(credito)} no cartao. Nivel aceitavel, mas fique atento as faturas futuras, especialmente se houver parcelamentos.` });
    }
  }

  // PARCELAMENTOS
  const parcelados = outflowsSemInvest.filter(e => e.installment > 0);
  if (parcelados.length > 0) {
    const totalParc = getTotal(parcelados);
    const parcPct = base > 0 ? Math.round(totalParc / base * 100) : 0;
    if (parcelados.length >= 5) {
      tips.push({ type: 'bad', icon: '!', title: `${parcelados.length} parcelamentos ativos!`, text: `${fmt(totalParc)} comprometidos em parcelas (${parcPct}% da receita). Muitas parcelas reduzem sua capacidade financeira nos proximos meses. Evite novas compras parceladas.` });
    } else if (parcelados.length >= 3) {
      tips.push({ type: 'warn', icon: '!', title: `${parcelados.length} parcelamentos em andamento`, text: `${fmt(totalParc)} em parcelas (${parcPct}% da receita). Cuidado ao adicionar novos parcelamentos — eles se acumulam e comprometem meses futuros.` });
    }
  }

  // MAIOR CATEGORIA
  const sortedCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  if (sortedCats.length >= 2) {
    const [topCat, topVal] = sortedCats[0];
    if (topCat !== 'Moradia') {
      const topPct = Math.round(topVal / base * 100);
      tips.push({ type: 'info', icon: 'i', title: `Maior gasto: ${topCat} (${topPct}%)`, text: `${fmt(topVal)} na categoria ${topCat}. Avalie se esse valor esta dentro do esperado ou se ha espaco para otimizar.` });
    }
  }

  // SAUDE
  const saude = byCat['Saude'] || 0;
  if (saude === 0 && despesasReais > 500) {
    tips.push({ type: 'info', icon: 'i', title: 'Nada registrado em Saude', text: 'Nao ha gastos com saude este mes. Consultas preventivas e check-ups regulares evitam gastos maiores no futuro.' });
  }

  // EDUCACAO
  const educacao = byCat['Educacao'] || 0;
  if (educacao > 0 && base > 0) {
    const eduPct = Math.round(educacao / base * 100);
    tips.push({ type: 'good', icon: 'ok', title: `Investindo em educacao: ${eduPct}%`, text: `${fmt(educacao)} em educacao. Investir em conhecimento e uma das melhores formas de aumentar sua renda a longo prazo.` });
  }

  // VISAO FAMILIAR
  if (activeMember === 'all') {
    const individuals = getIndividualMembers();
    if (individuals.length >= 2) {
      const memberTotals = individuals.map(mb => {
        const mbOut = outflows.filter(e => e.memberId === mb.id && e.cat !== 'Investimento');
        return { name: mb.name, total: getTotal(mbOut) };
      }).filter(m => m.total > 0);

      if (memberTotals.length >= 2) {
        const sorted = memberTotals.sort((a, b) => b.total - a.total);
        const diff = sorted[0].total - sorted[sorted.length - 1].total;
        if (diff > sorted[sorted.length - 1].total * 0.5) {
          tips.push({ type: 'info', icon: 'i', title: 'Diferenca nos gastos individuais', text: `${sorted[0].name} gastou ${fmt(sorted[0].total)} e ${sorted[sorted.length - 1].name} gastou ${fmt(sorted[sorted.length - 1].total)}. Pode ser util alinhar os orcamentos individuais.` });
        }
      }

      const famOut = outflows.filter(e => (!e.memberId || e.memberId === 'all') && e.cat !== 'Investimento');
      const famTotal = getTotal(famOut);
      if (famTotal > 0 && despesasReais > 0) {
        const famPct = Math.round(famTotal / despesasReais * 100);
        if (famPct > 50) {
          tips.push({ type: 'info', icon: 'i', title: `${famPct}% dos gastos sao compartilhados`, text: `${fmt(famTotal)} em despesas da familia em conjunto. Revisar esses gastos com todos os membros pode encontrar oportunidades de economia coletiva.` });
        }
      }
    }
  }

  // REGRA 50-30-20
  if (totalIncome > 0 && despesasReais > 0) {
    const essenciais = (byCat['Moradia'] || 0) + (byCat['Alimentacao'] || 0) + (byCat['Transporte'] || 0) + (byCat['Saude'] || 0) + (byCat['Educacao'] || 0);
    const desejos = (byCat['Lazer'] || 0) + (byCat['Vestuario'] || 0) + (byCat['Assinaturas'] || 0);
    const essePct = Math.round(essenciais / totalIncome * 100);
    const desPct = Math.round(desejos / totalIncome * 100);
    const investPctRule = Math.round(investSaida / totalIncome * 100);

    if (essePct > 0 || desPct > 0) {
      let ruleType: Tip['type'] = 'info';
      const ruleTitle = `Regra 50-30-20: ${essePct}%-${desPct}%-${investPctRule}%`;
      let ruleText = `Essenciais: ${essePct}% (meta 50%) | Desejos: ${desPct}% (meta 30%) | Investimentos: ${investPctRule}% (meta 20%). `;
      if (essePct <= 55 && desPct <= 35 && investPctRule >= 15) {
        ruleType = 'good';
        ruleText += 'Voce esta dentro de um padrao saudavel!';
      } else if (essePct > 60) {
        ruleText += 'Seus custos essenciais estao altos — busque renegociar contratos ou encontrar alternativas mais baratas.';
      } else if (desPct > 35) {
        ruleText += 'Gastos com desejos acima do ideal. Pequenos cortes aqui liberam dinheiro para investir.';
      } else if (investPctRule < 10) {
        ruleText += 'Seus investimentos estao abaixo do ideal. Redirecione parte do saldo disponivel para aportes.';
      } else {
        ruleText += 'Alguns ajustes podem equilibrar melhor seu orcamento.';
      }
      tips.push({ type: ruleType, icon: ruleType === 'good' ? 'ok' : 'i', title: ruleTitle, text: ruleText });
    }
  }

  return tips;
}
