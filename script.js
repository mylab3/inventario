document.addEventListener('DOMContentLoaded', () => {
    // --- RIFERIMENTI DOM ---
    const itemSelect = document.getElementById('item-select');
    const addBtn = document.getElementById('add-btn');
    const removeBtn = document.getElementById('remove-btn');
    const inventoryTableBody = document.getElementById('inventory-table-body');
    const newItemNameInput = document.getElementById('new-item-name');
    const addToCatalogBtn = document.getElementById('add-to-catalog-btn');
    const catalogList = document.getElementById('catalog-list');
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    const shareBtn = document.getElementById('share-btn');
    // Nuovi riferimenti per backup/ripristino
    const exportDataBtn = document.getElementById('export-data-btn');
    const importFileInput = document.getElementById('import-file-input');

    // --- CHIAVI DI ARCHIVIAZIONE E STATO DELL'APP ---
    const INVENTORY_KEY = 'smartInventory_inventory_v2'; // Nome chiave aggiornato per sicurezza
    const CATALOG_KEY = 'smartInventory_catalog_v2';
    let inventory = {};
    let catalog = [];

    // --- FUNZIONI DI GESTIONE DATI ---
    const loadData = () => {
        try {
            const savedInventory = localStorage.getItem(INVENTORY_KEY);
            const savedCatalog = localStorage.getItem(CATALOG_KEY);
            if (savedInventory) inventory = JSON.parse(savedInventory);
            if (savedCatalog) catalog = JSON.parse(savedCatalog);
            console.log("Dati caricati con successo dal localStorage.");
        } catch (error) {
            console.error("Errore nel caricamento dei dati: ", error);
            alert("Attenzione: non è stato possibile caricare i dati precedenti. Potrebbero essere corrotti.");
        }
    };

    const saveInventory = () => localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory));
    const saveCatalog = () => localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog));

    // --- FUNZIONI DI AGGIORNAMENTO INTERFACCIA ---
    const updateAllDisplays = () => {
        updateInventoryDisplay();
        updateCatalogDisplay();
        updateItemSelectDropdown();
    };
    
    // (Le funzioni updateInventoryDisplay, updateCatalogDisplay, updateItemSelectDropdown rimangono invariate)
    const updateInventoryDisplay=()=>{inventoryTableBody.innerHTML="";const t=Object.keys(inventory).sort();if(0===t.length)return void(inventoryTableBody.innerHTML='<tr><td colspan="3" style="text-align: center;">L\'inventario è vuoto.</td></tr>');t.forEach(e=>{const t=document.createElement("tr");t.innerHTML=`\n                <td>${e}</td>\n                <td>${inventory[e]}</td>\n                <td><button class="reset-btn" data-item="${e}"><i class="fa-solid fa-trash"></i> Reset</button></td>\n            `,inventoryTableBody.appendChild(t)})};const updateCatalogDisplay=()=>{catalogList.innerHTML="";catalog.sort().forEach(t=>{const e=document.createElement("li");e.textContent=t;const o=document.createElement("button");o.className="remove-from-catalog-btn",o.innerHTML='<i class="fa-solid fa-times-circle"></i>',o.title="Rimuovi dal catalogo",o.dataset.item=t,e.appendChild(o),catalogList.appendChild(e)})};const updateItemSelectDropdown=()=>{itemSelect.innerHTML='<option value="">-- Seleziona un articolo --</option>';catalog.sort().forEach(t=>{const e=document.createElement("option");e.value=t,e.textContent=t,itemSelect.appendChild(e)})};

    // --- GESTIONE EVENTI (Movimentazione e Catalogo) ---
    // (Tutti gli addEventListener per addBtn, removeBtn, addToCatalogBtn, etc. rimangono invariati)
    addToCatalogBtn.addEventListener("click",()=>{const t=newItemNameInput.value.trim();t&&!catalog.includes(t)?(catalog.push(t),saveCatalog(),updateAllDisplays(),newItemNameInput.value=""):catalog.includes(t)?alert("Questo articolo è già presente nel catalogo."):alert("Inserisci un nome per l'articolo.")}),catalogList.addEventListener("click",t=>{const e=t.target.closest(".remove-from-catalog-btn");e&&confirm(`Sei sicuro di voler rimuovere "${e.dataset.item}" dal catalogo? Verrà rimosso anche dall'inventario.`)(catalog=catalog.filter(t=>t!==e.dataset.item),delete inventory[e.dataset.item],saveCatalog(),saveInventory(),updateAllDisplays())}),addBtn.addEventListener("click",()=>{const t=itemSelect.value;t?(inventory[t]=(inventory[t]||0)+1,saveInventory(),updateInventoryDisplay()):alert("Seleziona un articolo dal menu.")}),removeBtn.addEventListener("click",()=>{const t=itemSelect.value;t&&inventory[t]>0?(inventory[t]--,0===inventory[t]&&delete inventory[t],saveInventory(),updateInventoryDisplay()):t?alert("Articolo non presente nell'inventario."):alert("Seleziona un articolo dal menu.")}),inventoryTableBody.addEventListener("click",t=>{const e=t.target.closest(".reset-btn");e&&confirm(`Sei sicuro di voler azzerare il conteggio per "${e.dataset.item}"?`)(delete inventory[e.dataset.item],saveInventory(),updateInventoryDisplay())});

    // --- NUOVE FUNZIONI: ESPORTA E IMPORTA DATI ---
    const exportData = () => {
        const dataToExport = {
            catalog: catalog,
            inventory: inventory
        };
        const dataStr = JSON.stringify(dataToExport, null, 2); // Il 2 formatta il JSON per essere leggibile
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().slice(0, 10); // Formato YYYY-MM-DD
        a.download = `inventario-backup-${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('Backup esportato con successo!');
    };
    
    const importData = (event) => {
        const file = event.target.files[0];
        if (!file) {
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                // Validazione del file importato
                if (data && Array.isArray(data.catalog) && typeof data.inventory === 'object') {
                    if (confirm('Sei sicuro di voler importare questi dati? L\'inventario e il catalogo attuali verranno sovrascritti.')) {
                        catalog = data.catalog;
                        inventory = data.inventory;
                        saveCatalog();
                        saveInventory();
                        updateAllDisplays();
                        alert('Dati importati con successo!');
                    }
                } else {
                    alert('File di backup non valido o corrotto.');
                }
            } catch (error) {
                alert('Errore durante la lettura del file. Assicurati che sia un file di backup valido.');
                console.error("Errore parsing JSON: ", error);
            } finally {
                // Resetta l'input per permettere di caricare lo stesso file di nuovo
                importFileInput.value = '';
            }
        };
        reader.readAsText(file);
    };

    exportDataBtn.addEventListener('click', exportData);
    importFileInput.addEventListener('change', importData);

    // --- FUNZIONI DI REPORTING (invariate) ---
    const generatePDF=()=>{const{jsPDF:t}=window.jspdf,e=new t;e.setFontSize(18),e.text("Report Inventario",14,22);const o=Object.entries(inventory).map(([t,e])=>[t,e]);0===o.length?e.text("L'inventario è vuoto.",14,40):e.autoTable({head:[["Articolo","Quantità"]],body:o,startY:35}),e.save(`report-inventario-${Date.now()}.pdf`)},shareReport=async()=>{let t="Report Inventario:\n\n";0===Object.keys(inventory).length?t+="L'inventario è vuoto.":Object.entries(inventory).forEach(([e,o])=>{t+=`- ${e}: ${o} pz.\n`}),navigator.share?await navigator.share({title:"Report Inventario",text:t}).catch(t=>{console.error("Errore condivisione:",t)}):alert("La condivisione non è supportata su questo browser.")};
    exportPdfBtn.addEventListener('click', generatePDF);
    shareBtn.addEventListener('click', shareReport);

    // --- INIZIALIZZAZIONE ---
    loadData();
    updateAllDisplays();
});