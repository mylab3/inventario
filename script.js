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
    const orderBtn = document.getElementById('order-btn');
    const exportDataBtn = document.getElementById('export-data-btn');
    const importFileInput = document.getElementById('import-file-input');

    // --- CHIAVI DI ARCHIVIAZIONE E STATO DELL'APP ---
    const INVENTORY_KEY = 'smartInventory_inventory_v3';
    const CATALOG_KEY = 'smartInventory_catalog_v3';
    let inventory = {}; // Esempio: { "Vite M6": { qta: 10, daOrdinare: false } }
    let catalog = [];

    // --- FUNZIONI DI GESTIONE DATI ---
    const loadData = () => {
        try {
            const savedInventory = localStorage.getItem(INVENTORY_KEY);
            const savedCatalog = localStorage.getItem(CATALOG_KEY);
            if (savedInventory) inventory = JSON.parse(savedInventory);
            if (savedCatalog) catalog = JSON.parse(savedCatalog);
        } catch (error) {
            alert("Attenzione: non è stato possibile caricare i dati precedenti.");
        }
    };

    const saveData = () => {
        localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory));
        localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog));
    };

    // --- FUNZIONI DI AGGIORNAMENTO INTERFACCIA ---
    const updateAllDisplays = () => {
        updateInventoryDisplay();
        updateCatalogDisplay();
        updateItemSelectDropdown();
    };

    const updateInventoryDisplay = () => {
        inventoryTableBody.innerHTML = '';
        
        // MODIFICATO: Ordina l'inventario per quantità crescente
        const sortedItems = Object.keys(inventory).sort((a, b) => {
            return inventory[a].qta - inventory[b].qta;
        });

        if (sortedItems.length === 0) {
            inventoryTableBody.innerHTML = `<tr><td colspan="3" style="text-align: center;">L'inventario è vuoto.</td></tr>`;
            return;
        }

        sortedItems.forEach(item => {
            const itemData = inventory[item];
            const row = document.createElement('tr');
            // NUOVO: Aggiunge una classe se la quantità è zero per styling
            if (itemData.qta === 0) {
                row.classList.add('is-zero');
            }

            // NUOVO: Cella con la checkbox (flag)
            const flagCell = document.createElement('td');
            flagCell.style.textAlign = 'center';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'order-flag';
            checkbox.checked = itemData.daOrdinare;
            checkbox.dataset.item = item;
            flagCell.appendChild(checkbox);

            const itemCell = document.createElement('td');
            itemCell.textContent = item;

            const qtaCell = document.createElement('td');
            qtaCell.textContent = itemData.qta;
            qtaCell.className = 'quantity-cell';

            row.appendChild(flagCell);
            row.appendChild(itemCell);
            row.appendChild(qtaCell);
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
    
    // MODIFICATO: Aggiunge l'articolo con quantità 0 all'inventario
    addToCatalogBtn.addEventListener('click', () => {
        const newItem = newItemNameInput.value.trim();
        if (newItem && !catalog.includes(newItem)) {
            catalog.push(newItem);
            inventory[newItem] = { qta: 0, daOrdinare: false }; // NUOVA LOGICA
            saveData();
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
            if (confirm(`Sei sicuro di voler rimuovere "${itemToRemove}" dal catalogo e dall'inventario?`)) {
                catalog = catalog.filter(item => item !== itemToRemove);
                delete inventory[itemToRemove];
                saveData();
                updateAllDisplays();
            }
        }
    });

    addBtn.addEventListener('click', () => {
        const selectedItem = itemSelect.value;
        if (selectedItem) {
            inventory[selectedItem].qta++;
            saveData();
            updateInventoryDisplay();
        } else {
            alert('Seleziona un articolo dal menu.');
        }
    });
    
    // MODIFICATO: Non cancella l'articolo quando arriva a 0
    removeBtn.addEventListener('click', () => {
        const selectedItem = itemSelect.value;
        if (selectedItem && inventory[selectedItem] && inventory[selectedItem].qta > 0) {
            inventory[selectedItem].qta--;
            saveData();
            updateInventoryDisplay();
        } else {
            alert('Seleziona un articolo con quantità maggiore di zero.');
        }
    });
    
    // NUOVO: Gestisce il click sulla checkbox per flaggare l'ordine
    inventoryTableBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('order-flag')) {
            const checkbox = e.target;
            const item = checkbox.dataset.item;
            inventory[item].daOrdinare = checkbox.checked;
            saveData();
        }
    });

    // NUOVO: Logica per il pulsante "Effettua Ordine"
    orderBtn.addEventListener('click', () => {
        const itemsToOrder = Object.keys(inventory).filter(item => inventory[item].daOrdinare);

        if (itemsToOrder.length === 0) {
            alert("Nessun articolo è stato selezionato per l'ordine.");
            return;
        }
        
        const itemsListText = itemsToOrder.join('\n');

        const orderText = `Per il dott. Gervaxx
da MXXXX Cxxxx

cortesemente richiedo

${itemsListText}

Grazie
Cordiali saluti`;

        if (navigator.share) {
            navigator.share({
                title: 'Ordine Materiale',
                text: orderText,
            }).catch(error => console.log('Errore nella condivisione', error));
        } else {
            alert("La funzione di condivisione non è supportata da questo browser. Puoi copiare il testo manualmente.");
            prompt("Copia questo testo:", orderText);
        }
    });


    // --- FUNZIONI DI BACKUP E REPORT ---
    const exportData = () => {
        const dataToExport = { catalog, inventory };
        const dataStr = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().slice(0, 10);
        a.download = `inventario-backup-${date}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };
    
    const importData = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data && Array.isArray(data.catalog) && typeof data.inventory === 'object') {
                    if (confirm('Sei sicuro di voler importare? I dati attuali verranno sovrascritti.')) {
                        catalog = data.catalog;
                        inventory = data.inventory;
                        saveData();
                        updateAllDisplays();
                        alert('Dati importati con successo!');
                    }
                } else {
                    alert('File di backup non valido.');
                }
            } catch (error) {
                alert('Errore durante la lettura del file.');
            } finally {
                importFileInput.value = '';
            }
        };
        reader.readAsText(file);
    };

    exportDataBtn.addEventListener('click', exportData);
    importFileInput.addEventListener('change', importData);
    exportPdfBtn.addEventListener('click', () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("Report Inventario", 14, 22);
        const tableData = Object.entries(inventory)
                              .sort(([,a], [,b]) => a.qta - b.qta)
                              .map(([item, data]) => [data.daOrdinare ? 'Sì' : 'No', item, data.qta]);
        doc.autoTable({ head: [['Da Ordinare', 'Articolo', 'Quantità']], body: tableData, startY: 35 });
        doc.save(`report-inventario-${new Date().toISOString().slice(0, 10)}.pdf`);
    });

    // --- INIZIALIZZAZIONE ---
    loadData();
    updateAllDisplays();
});