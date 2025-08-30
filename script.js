(() => {
  // === SELETORES DE ELEMENTOS DO DOM ===
  const $ = (sel, el = document) => el.querySelector(sel);
  const listEl = $("#list");
  const template = $("#subject-template");
  const totalPill = $("#total");

  // Botões de ação principais
  const showAddModalBtn = $("#show-add-modal");
  const showIoModalBtn = $("#show-io-modal");

  // Modal de Adicionar
  const addModal = $("#add-modal");
  const newNameEl = $("#newName", addModal);
  const newCountEl = $("#newCount", addModal);
  const addBtn = $("#add", addModal);

  // Modal de I/O
  const ioModal = $("#io-modal");
  const exportBtn = $("#export", ioModal);
  const importInput = $("#import", ioModal);
  const clearAllBtn = $("#clearAll", ioModal);
  const resetBtn = $("#reset", ioModal);

  // === ESTADO DA APLICAÇÃO ===
  let subjects = load();

  // === FUNÇÕES UTILITÁRIAS ===
  function uid() {
    return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  }

  // === PERSISTÊNCIA DE DADOS ===
  function load() {
    try {
      const raw = localStorage.getItem("study-board:v1");
      if (!raw) return demoData();
      return JSON.parse(raw);
    } catch (e) {
      console.warn("Falha ao carregar, usando demo", e);
      return demoData();
    }
  }

  function demoData() {
    return [
      { id: uid(), name: "Matemática", boxes: new Array(15).fill(true).fill(false, 5) },
      { id: uid(), name: "Física", boxes: new Array(10).fill(false) },
      { id: uid(), name: "Química", boxes: new Array(6).fill(true) },
    ];
  }

  function save() {
    localStorage.setItem("study-board:v1", JSON.stringify(subjects));
    updateTotals();
  }

  // === FUNÇÕES DE RENDERIZAÇÃO E ATUALIZAÇÃO DA UI ===
  function updateTotals() {
    const total = subjects.reduce((a, s) => a + s.boxes.length, 0);
    const done = subjects.reduce((a, s) => a + s.boxes.filter(Boolean).length, 0);
    const percentage = total > 0 ? Math.round((done / total) * 100) : 0;
    totalPill.textContent = `${percentage}%`;
  }

  function updateProgress(li, subj) {
    const done = subj.boxes.filter(Boolean).length;
    const total = subj.boxes.length;
    const percentage = total > 0 ? Math.round((done / total) * 100) : 0;
    li.querySelector(".progress").textContent = `${percentage}% (${done}/${total})`;
  }

  function render() {
    listEl.innerHTML = "";
    subjects.forEach(s => {
      const li = template.content.firstElementChild.cloneNode(true);
      li.dataset.id = s.id;
      
      const nameDiv = li.querySelector(".name");
      nameDiv.textContent = s.name;

      const boxesDiv = li.querySelector(".boxes");
      boxesDiv.innerHTML = ""; // Limpa caixas antigas antes de renderizar
      s.boxes.forEach((isChecked, idx) => {
        const input = document.createElement("input");
        input.type = "checkbox";
        input.className = "box";
        input.checked = !!isChecked;
        input.dataset.index = idx;
        input.addEventListener("change", () => {
          subjects.find(x => x.id === s.id).boxes[idx] = input.checked;
          save();
          updateProgress(li, s);
        });
        boxesDiv.appendChild(input);
      });

      updateProgress(li, s);

      // --- Eventos dos Controles da Matéria ---
      li.querySelector(".btn-add").addEventListener("click", () => {
        subjects.find(x => x.id === s.id).boxes.push(false);
        save();
        render();
      });
      li.querySelector(".btn-remove").addEventListener("click", () => {
        subjects.find(x => x.id === s.id).boxes.pop();
        save();
        render();
      });
      li.querySelector(".btn-clear").addEventListener("click", () => {
        const subj = subjects.find(x => x.id === s.id);
        subj.boxes.fill(false);
        save();
        render();
      });
      li.querySelector(".btn-delete").addEventListener("click", () => {
        if (!confirm(`Tem certeza que deseja remover "${s.name}"?`)) return;
        subjects = subjects.filter(x => x.id !== s.id);
        save();
        render();
      });

      nameDiv.addEventListener("input", () => {
        subjects.find(x => x.id === s.id).name = nameDiv.textContent.trim() || "Sem nome";
        save();
      });

      // --- Drag and Drop ---
      li.addEventListener("dragstart", e => {
        li.classList.add("ghost");
        e.dataTransfer.setData("text/plain", s.id);
      });
      li.addEventListener("dragend", () => li.classList.remove("ghost"));
      li.addEventListener("dragover", e => { e.preventDefault(); li.classList.add("drag-over"); });
      li.addEventListener("dragleave", () => li.classList.remove("drag-over"));
      li.addEventListener("drop", e => {
        e.preventDefault();
        li.classList.remove("drag-over");
        const fromId = e.dataTransfer.getData("text/plain");
        const fromIdx = subjects.findIndex(x => x.id === fromId);
        const toIdx = subjects.findIndex(x => x.id === s.id);
        if (fromIdx > -1 && toIdx > -1) {
          const [movedItem] = subjects.splice(fromIdx, 1);
          subjects.splice(toIdx, 0, movedItem);
          save();
          render();
        }
      });

      listEl.appendChild(li);
    });
    updateTotals();
  }

  // === LÓGICA DOS MODAIS ===
  function openModal(modal) { modal.classList.remove("hidden"); }
  function closeModal(modal) { modal.classList.add("hidden"); }

  [addModal, ioModal].forEach(modal => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal(modal); // Fecha se clicar no fundo
    });
    modal.querySelector(".modal-close").addEventListener("click", () => closeModal(modal));
  });

  showAddModalBtn.addEventListener("click", () => {
    openModal(addModal);
    newNameEl.focus();
  });
  showIoModalBtn.addEventListener("click", () => openModal(ioModal));
  
  // === EVENT LISTENERS GLOBAIS ===
  addBtn.addEventListener("click", () => {
    const name = (newNameEl.value || "").trim() || "Nova matéria";
    const count = Math.max(1, Math.min(100, parseInt(newCountEl.value || "1", 10)));
    subjects.push({ id: uid(), name, boxes: new Array(count).fill(false) });
    newNameEl.value = "";
    newCountEl.value = 6;
    save();
    render();
    closeModal(addModal);
  });
  newNameEl.addEventListener("keydown", e => { if (e.key === "Enter") addBtn.click(); });

  clearAllBtn.addEventListener("click", () => {
    if (!confirm("Desmarcar todas as caixas de todas as matérias?")) return;
    subjects.forEach(s => s.boxes.fill(false));
    save();
    render();
  });

  exportBtn.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(subjects, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quadro-estudos-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  importInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data) || !data.every(i => typeof i.name === 'string' && Array.isArray(i.boxes))) {
        throw new Error("Formato de arquivo inválido.");
      }
      if (!confirm("Isso irá substituir seus dados atuais. Continuar?")) return;
      subjects = data.map(it => ({ ...it, id: it.id || uid() }));
      save();
      render();
      closeModal(ioModal);
    } catch (err) {
      alert("Falha ao importar: " + err.message);
    } finally {
      e.target.value = "";
    }
  });

  resetBtn.addEventListener("click", () => {
    if (!confirm("Apagar tudo e voltar ao modelo? Esta ação não pode ser desfeita.")) return;
    subjects = demoData();
    save();
    render();
  });
  
  // === INICIALIZAÇÃO ===
  render();
})();