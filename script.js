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

    // --- CHIAVI DI ARCHIVIAZIONE E STATO DELL'APP ---
    const INVENTORY_KEY = 'smartInventory_inventory';
    const CATALOG_KEY = 'smartInventory_catalog';
    let inventory = {};
    let catalog = [];

    // --- FUNZIONI DI GESTIONE DATI (CATALOGO E INVENTARIO) ---
    const loadData = () => {
        const savedInventory = localStorage.getItem(INVENTORY_KEY);
        const savedCatalog = localStorage.getItem(CATALOG_KEY);
        if (savedInventory) inventory = JSON.parse(savedInventory);
        if (savedCatalog) catalog = JSON.parse(savedCatalog);
    };

    const saveInventory = () => localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory));
    const saveCatalog = () => localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog));

    // --- FUNZIONI DI AGGIORNAMENTO INTERFACCIA ---
    const updateAllDisplays = () => {
        updateInventoryDisplay();
        updateCatalogDisplay();
        updateItemSelectDropdown();
    };

    const updateInventoryDisplay = () => {
        inventoryTableBody.innerHTML = '';
        const sortedItems = Object.keys(inventory).sort();
        if (sortedItems.length === 0) {
            inventoryTableBody.innerHTML = `<tr><td colspan="3" style="text-align: center;">L'inventario è vuoto.</td></tr>`;
            return;
        }
        sortedItems.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item}</td>
                <td>${inventory[item]}</td>
                <td><button class="reset-btn" data-item="${item}"><i class="fa-solid fa-trash"></i> Reset</button></td>
            `;
            inventoryTableBody.appendChild(row);
        });
    };

    const updateCatalogDisplay = () => {
        catalogList.innerHTML = '';
        catalog.sort().forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-from-catalog-btn';
            removeBtn.innerHTML = '<i class="fa-solid fa-times-circle"></i>';
            removeBtn.title = 'Rimuovi dal catalogo';
            removeBtn.dataset.item = item;
            li.appendChild(removeBtn);
            catalogList.appendChild(li);
        });
    };

    const updateItemSelectDropdown = () => {
        itemSelect.innerHTML = '<option value="">-- Seleziona un articolo --</option>';
        catalog.sort().forEach(item => {
            const option = document.createElement('option');
            option.value = item;
            option.textContent = item;
            itemSelect.appendChild(option);
        });
    };

    // --- GESTIONE EVENTI ---
    addToCatalogBtn.addEventListener('click', () => {
        const newItem = newItemNameInput.value.trim();
        if (newItem && !catalog.includes(newItem)) {
            catalog.push(newItem);
            saveCatalog();
            updateAllDisplays();
            newItemNameInput.value = '';
        } else if (catalog.includes(newItem)) {
            alert('Questo articolo è già presente nel catalogo.');
        } else {
            alert('Inserisci un nome per l\'articolo.');
        }
    });

    catalogList.addEventListener('click', (e) => {
        const targetButton = e.target.closest('.remove-from-catalog-btn');
        if (targetButton) {
            const itemToRemove = targetButton.dataset.item;
            if (confirm(`Sei sicuro di voler rimuovere "${itemToRemove}" dal catalogo? Verrà rimosso anche dall'inventario.`)) {
                catalog = catalog.filter(item => item !== itemToRemove);
                delete inventory[itemToRemove];
                saveCatalog();
                saveInventory();
                updateAllDisplays();
            }
        }
    });

    addBtn.addEventListener('click', () => {
        const selectedItem = itemSelect.value;
        if (selectedItem) {
            inventory[selectedItem] = (inventory[selectedItem] || 0) + 1;
            saveInventory();
            updateInventoryDisplay();
        } else {
            alert('Seleziona un articolo dal menu.');
        }
    });

    removeBtn.addEventListener('click', () => {
        const selectedItem = itemSelect.value;
        if (selectedItem && inventory[selectedItem] > 0) {
            inventory[selectedItem]--;
            if (inventory[selectedItem] === 0) {
                delete inventory[selectedItem];
            }
            saveInventory();
            updateInventoryDisplay();
        } else if (!selectedItem) {
            alert('Seleziona un articolo dal menu.');
        } else {
            alert('Articolo non presente nell\'inventario.');
        }
    });

    inventoryTableBody.addEventListener('click', (e) => {
        const targetButton = e.target.closest('.reset-btn');
        if (targetButton) {
            const itemToReset = targetButton.dataset.item;
            if (confirm(`Sei sicuro di voler azzerare il conteggio per "${itemToReset}"?`)) {
                delete inventory[itemToReset];
                saveInventory();
                updateInventoryDisplay();
            }
        }
    });

    // --- FUNZIONI DI REPORTING ---
    const generatePDF = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("Report Inventario", 14, 22);
        const tableData = Object.entries(inventory).map(([item, qty]) => [item, qty]);
        if (tableData.length === 0) {
            doc.text("L'inventario è vuoto.", 14, 40);
        } else {
            doc.autoTable({ head: [['Articolo', 'Quantità']], body: tableData, startY: 35 });
        }
        doc.save(`report-inventario-${Date.now()}.pdf`);
    };

    const shareReport = async () => {
        let reportText = "Report Inventario:\n\n";
        if (Object.keys(inventory).length === 0) reportText += "L'inventario è vuoto.";
        else Object.entries(inventory).forEach(([item, qty]) => { reportText += `- ${item}: ${qty} pz.\n`; });
        
        if (navigator.share) {
            try { await navigator.share({ title: 'Report Inventario', text: reportText }); }
            catch (error) { console.error('Errore condivisione:', error); }
        } else {
            alert("La condivisione non è supportata su questo browser.");
        }
    };
    
    exportPdfBtn.addEventListener('click', generatePDF);
    shareBtn.addEventListener('click', shareReport);

    // --- INIZIALIZZAZIONE ---
    loadData();
    updateAllDisplays();
});