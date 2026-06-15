import { useState, useEffect } from 'react';
import html2pdf from 'html2pdf.js';
import './App.css';
import logoSK from './assets/logosk.png';

const formatarBRL = (valor) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(valor);

const normalizarNome = (texto) =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');

const IconeOlho = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconePDF = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="12" y1="18" x2="12" y2="12" />
    <line x1="9" y1="15" x2="15" y2="15" />
  </svg>
);

export default function OrcamentoApp() {
  const [form, setForm] = useState({
    nomeCliente: '',
    telefone: '',
    cpfCnpj: '',
    endereco: '',
    modeloCarro: '',
    placaCarro: '',
    corCarro: '',
    anoCarro: '',
  });

  const [pecas, setPecas] = useState([{ descricao: '', valor: '' }]);
  const [servicos, setServicos] = useState([{ descricao: '', valor: '' }]);
  const [previewAberto, setPreviewAberto] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [escalaPreview, setEscalaPreview] = useState(1);

  const handleForm = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const atualizarLinha = (lista, setLista, index, campo, valor) => {
    const nova = [...lista];
    nova[index] = { ...nova[index], [campo]: valor };
    setLista(nova);
  };

  const totalPecas = pecas.reduce((s, p) => s + (parseFloat(p.valor) || 0), 0);
  const totalServicos = servicos.reduce((s, m) => s + (parseFloat(m.valor) || 0), 0);
  const total = totalPecas + totalServicos;

  const hoje = new Date().toLocaleDateString('pt-BR');

  // Calcula escala do preview conforme largura da tela
  useEffect(() => {
    if (!previewAberto) return;
    const calcular = () => {
      const escala = Math.min(1, (window.innerWidth - 48) / 700);
      setEscalaPreview(Math.round(escala * 100) / 100);
    };
    calcular();
    window.addEventListener('resize', calcular);
    return () => window.removeEventListener('resize', calcular);
  }, [previewAberto]);

  // Bloqueia scroll do body quando preview está aberto
  useEffect(() => {
    document.body.style.overflow = previewAberto ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [previewAberto]);

  // Compartilha no celular (menu nativo: WhatsApp, e-mail, etc.)
  // No desktop faz download direto
  const compartilharOuBaixar = async (blob, nomeArq) => {
    const arquivo = new File([blob], nomeArq, { type: 'application/pdf' });
    try {
      if (
        navigator.share &&
        (navigator.canShare ? navigator.canShare({ files: [arquivo] }) : true)
      ) {
        await navigator.share({
          title: 'Orçamento SK Funilaria e Pintura',
          text: `Orçamento para ${form.nomeCliente} — ${form.modeloCarro}`,
          files: [arquivo],
        });
        return; // sucesso — não precisa baixar
      }
    } catch (err) {
      if (err.name === 'AbortError') return; // usuário fechou o menu — ok
      // outro erro: cai para o download abaixo
    }
    // Fallback: download normal (desktop ou share não disponível)
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArq;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const gerarPDF = () => {
    if (!form.nomeCliente || !form.placaCarro || !form.modeloCarro) {
      alert('Preencha pelo menos: Nome do Cliente, Placa e Modelo do Carro');
      return;
    }

    setPreviewAberto(false);
    setGerando(true);

    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const nomeArq = `orcamentosk${normalizarNome(form.nomeCliente)}${normalizarNome(form.modeloCarro)}.pdf`;
        const el = document.getElementById('pdf-content');

        html2pdf()
          .set({
            margin: [14, 14, 14, 14],
            filename: nomeArq,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
          })
          .from(el)
          .toPdf()
          .get('pdf')
          .then(async (pdfObj) => {
            const blob = pdfObj.output('blob');
            await compartilharOuBaixar(blob, nomeArq);
          })
          .finally(() => setGerando(false));
      })
    );
  };

  const limpar = () => {
    setForm({ nomeCliente: '', telefone: '', cpfCnpj: '', endereco: '', modeloCarro: '', placaCarro: '', corCarro: '', anoCarro: '' });
    setPecas([{ descricao: '', valor: '' }]);
    setServicos([{ descricao: '', valor: '' }]);
  };

  // Classe do wrapper: controla visibilidade do template PDF
  const wrapperClass = [
    'pdf-wrapper',
    previewAberto ? 'preview-aberto' : '',
    gerando ? 'pdf-gerando' : '',
  ].filter(Boolean).join(' ');

  return (
    <>
      <div className="container">
        <header className="header">
          <img src={logoSK} alt="Logo SK" className="logo" />
          <h1 className="header-titulo">SK Funilaria e Pintura</h1>
          <p className="header-sub">Gerador de Orçamentos</p>
        </header>

        <main className="main-content">
          <section className="formulario">
            <h2 className="secao-titulo">Dados do Cliente</h2>
            <div className="form-grid">
              <Campo label="Nome Completo *" name="nomeCliente" value={form.nomeCliente} onChange={handleForm} placeholder="Ex: João Silva" />
              <Campo label="Telefone / Contato" name="telefone" value={form.telefone} onChange={handleForm} placeholder="+55 11 98765-4321" />
              <Campo label="CPF ou CNPJ" name="cpfCnpj" value={form.cpfCnpj} onChange={handleForm} placeholder="(opcional)" />
              <Campo label="Endereço" name="endereco" value={form.endereco} onChange={handleForm} placeholder="(opcional)" />
            </div>

            <h2 className="secao-titulo">Dados do Veículo</h2>
            <div className="form-grid">
              <Campo label="Modelo do Carro *" name="modeloCarro" value={form.modeloCarro} onChange={handleForm} placeholder="Ex: Honda Civic" />
              <Campo label="Placa *" name="placaCarro" value={form.placaCarro} onChange={handleForm} placeholder="Ex: ABC1D34" />
              <Campo label="Cor" name="corCarro" value={form.corCarro} onChange={handleForm} placeholder="Ex: Prata" />
              <Campo label="Ano" name="anoCarro" value={form.anoCarro} onChange={handleForm} placeholder="Ex: 2022" />
            </div>

            <h2 className="secao-titulo">Peças</h2>
            {pecas.map((p, i) => (
              <LinhaItem
                key={i}
                descricao={p.descricao}
                valor={p.valor}
                onDescricao={(v) => atualizarLinha(pecas, setPecas, i, 'descricao', v)}
                onValor={(v) => atualizarLinha(pecas, setPecas, i, 'valor', v)}
                onRemover={() => setPecas(pecas.filter((_, j) => j !== i))}
                placeholder="Descrição da peça"
              />
            ))}
            <button className="btn-adicionar" onClick={() => setPecas([...pecas, { descricao: '', valor: '' }])}>
              + Adicionar Peça
            </button>

            <h2 className="secao-titulo">Mão de Obra</h2>
            {servicos.map((m, i) => (
              <LinhaItem
                key={i}
                descricao={m.descricao}
                valor={m.valor}
                onDescricao={(v) => atualizarLinha(servicos, setServicos, i, 'descricao', v)}
                onValor={(v) => atualizarLinha(servicos, setServicos, i, 'valor', v)}
                onRemover={() => setServicos(servicos.filter((_, j) => j !== i))}
                placeholder="Descrição do serviço"
              />
            ))}
            <button className="btn-adicionar" onClick={() => setServicos([...servicos, { descricao: '', valor: '' }])}>
              + Adicionar Serviço
            </button>

            <div className="botoes-acao">
              <button className="btn-gerar-pdf" onClick={gerarPDF}>
                <IconePDF /> Gerar PDF
              </button>
              <button className="btn-preview" onClick={() => setPreviewAberto(true)}>
                <IconeOlho /> Pré-visualizar
              </button>
              <button className="btn-limpar" onClick={limpar}>Limpar</button>
            </div>
          </section>
        </main>
      </div>

      {/* Overlay de carregamento — cobre a tela enquanto o PDF é gerado */}
      {gerando && (
        <div className="overlay-gerando">
          <div className="overlay-gerando-box">
            <div className="spinner" />
            <p>Gerando PDF...</p>
          </div>
        </div>
      )}

      {/* Template do PDF — oculto por padrão, visível durante geração/preview */}
      <div className={wrapperClass}>
        {previewAberto && (
          <div className="preview-topo">
            <span className="preview-titulo">Pré-visualização do Orçamento</span>
            <button className="btn-fechar-preview" onClick={() => setPreviewAberto(false)}>✕ Fechar</button>
          </div>
        )}

        {/* preview-corpo: área de scroll — só ativo no preview */}
        <div className="preview-corpo">
        <div
          id="pdf-content"
          className="pdf-template"
          style={previewAberto ? { zoom: escalaPreview } : {}}
        >
          <p className="pt-cnpj">CNPJ: 25.268.162/0001-36</p>

          <div className="pt-logo-wrap">
            <img src={logoSK} alt="Logo SK" className="pt-logo" />
          </div>

          <p className="pt-titulo-orcamento">ORÇAMENTO</p>

          <div className="pt-bloco">
            <p className="pt-bloco-header"><strong><u>PECAS</u></strong> -</p>
            {pecas.filter((p) => p.descricao.trim()).map((p, i) => (
  <p key={i} className="pt-item">
    {`-  `}{p.descricao}
  </p>
))}
          </div>

          <div className="pt-bloco">
            <p className="pt-bloco-header"><strong><u>MAO DE OBRA</u></strong> -</p>
            {servicos.filter((m) => m.descricao.trim()).map((m, i) => {
              const val = parseFloat(m.valor) || 0;
              return (
                <p key={i} className="pt-item">
                  {`-  `}{m.descricao}{val > 0 ? ` R$ ${formatarBRL(val)}` : ''}
                </p>
              );
            })}
          </div>

          <p className="pt-total"><strong>Total: R$ {formatarBRL(total)}</strong></p>

          <div className="pt-dados">
            <p><strong>Cliente:</strong> {form.nomeCliente}</p>
            <p><strong>CPF:</strong> {form.cpfCnpj}</p>
            <p><strong>Contato:</strong> {form.telefone}</p>
            <p><strong>END:</strong> {form.endereco}</p>
            <p><strong>Carro:</strong> {form.modeloCarro}{form.anoCarro ? ` ${form.anoCarro}` : ''}</p>
            <p><strong>Placa:</strong> {form.placaCarro}</p>
            <p><strong>Cor:</strong> {form.corCarro}</p>
          </div>

          <div className="pt-rodape">
            <div className="pt-rodape-centro">
              <p><strong>skfunilaria.com.br</strong></p>
              <p>Funilaria SK</p>
              <p>11 97738-0393 (WHATSAPP).</p>
            </div>
            <p className="pt-rodape-end">
              Endereço : Av. Moaci 1414,<br />
              Planalto Paulista São Paulo S.P | Dia {hoje}
            </p>
          </div>
        </div>

          {previewAberto && (
            <button className="btn-baixar-preview" onClick={gerarPDF}>
              <IconePDF /> Baixar PDF
            </button>
          )}
        </div>{/* fim preview-corpo */}
      </div>
    </>
  );
}

function Campo({ label, name, value, onChange, placeholder }) {
  return (
    <div className="form-group">
      <label>{label}</label>
      <input type="text" name={name} value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  );
}

function LinhaItem({ descricao, valor, onDescricao, onValor, onRemover, placeholder }) {
  return (
    <div className="linha-item">
      <input
        type="text"
        placeholder={placeholder}
        value={descricao}
        onChange={(e) => onDescricao(e.target.value)}
      />
      <input
        type="number"
        placeholder="R$ 0,00"
        value={valor}
        onChange={(e) => onValor(e.target.value)}
        min="0"
        step="0.01"
      />
      <button className="btn-remover" onClick={onRemover}>✕</button>
    </div>
  );
}
