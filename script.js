document.addEventListener('DOMContentLoaded', () => {
    // Riferimenti DOM
    const video = document.getElementById('video');
    const scannedCodeInput = document.getElementById('scanned-code-input');
    const addBtn = document.getElementById('add-btn');
    const removeBtn = document.getElementById('remove-btn');
    const inventoryTableBody = document.getElementById('inventory-table-body');
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    const shareBtn = document.getElementById('share-btn');
    const startCameraBtn = document.getElementById('start-camera-btn');
    const startScannerOverlay = document.getElementById('start-scanner-overlay');
    const scannerLaser = document.querySelector('.scanner-laser');
    const debugLog = document.getElementById('debug-log');

    const STORAGE_KEY = 'smartInventoryApp';
    let inventory = {};

    // Funzione per scrivere nel log di debug visibile
    const log = (message) => {
        console.log(message); // Mantiene il log anche nella console del browser
        debugLog.textContent += `> ${message}\n`;
        debugLog.scrollTop = debugLog.scrollHeight; // Scrolla in basso automaticamente
    };

    const codeReader = new ZXing.BrowserMultiFormatReader();
    let selectedDeviceId = null;

    log('Script inizializzato correttamente. In attesa di avvio scanner.');

    // --- GESTIONE SCANNER ---
    const startScanner = () => {
        log('Pulsante "Avvia Scanner" premuto.');
        startScannerOverlay.style.display = 'none';

        codeReader.listVideoInputDevices()
            .then((videoInputDevices) => {
                log(`Trovate ${videoInputDevices.length} fotocamere.`);
                if (videoInputDevices.length === 0) {
                    log('ERRORE: Nessuna fotocamera trovata sul dispositivo.');
                    alert('Nessuna fotocamera trovata.');
                    return;
                }

                // Logga i nomi delle fotocamere trovate per debug
                videoInputDevices.forEach((device, index) => {
                    log(`  - Fotocamera ${index}: ${device.label} (ID: ${device.deviceId})`);
                });

                // Tenta di trovare la fotocamera posteriore
                const rearCamera = videoInputDevices.find(device => 
                    device.label.toLowerCase().includes('back') || 
                    device.label.toLowerCase().includes('rear') ||
                    device.label.toLowerCase().includes('posteriore')
                );

                if (rearCamera) {
                    selectedDeviceId = rearCamera.deviceId;
                    log(`Fotocamera posteriore trovata. Uso: ${rearCamera.label}`);
                } else {
                    // Altrimenti, usa l'ultima della lista (spesso la principale/posteriore)
                    selectedDeviceId = videoInputDevices[videoInputDevices.length - 1].deviceId;
                    log(`Fotocamera posteriore non identificata con certezza. Uso l'ultima disponibile: ${videoInputDevices[videoInputDevices.length - 1].label}`);
                }

                log('Tentativo di avviare lo streaming video...');
                scannerLaser.style.display = 'block'; // Mostra subito il laser

                codeReader.decodeFromVideoDevice(selectedDeviceId, 'video', (result, err) => {
                    if (result) {
                        log(`Codice rilevato: ${result.getText()}`);
                        scannedCodeInput.value = result.getText();
                        if ('vibrate' in navigator) {
                            navigator.vibrate(100);
                        }
                    }

                    if (err && !(err instanceof ZXing.NotFoundException)) {
                        log(`ERRORE durante la decodifica: ${err}`);
                    }
                });

            })
            .catch((err) => {
                log(`ERRORE CRITICO durante l'accesso alle fotocamere: ${err.name} - ${err.message}`);
                alert(`Impossibile accedere alla fotocamera. Controlla i permessi e assicurati di usare HTTPS. Errore: ${err.name}`);
            });
    };

    // --- FUNZIONI DI GESTIONE INVENTARIO ---
    const loadInventory = () => {
        const savedInventory = localStorage.getItem(STORAGE_KEY);
        if (savedInventory) {
            inventory = JSON.parse(savedInventory);
        }
    };

    const saveInventory = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
    };
    
    const updateInventoryDisplay = () => {
        inventoryTableBody.innerHTML = '';
        const sortedCodes = Object.keys(inventory).sort();

        if (sortedCodes.length === 0) {
            inventoryTableBody.innerHTML = `<tr><td colspan="3" style="text-align: center;">L'inventario è vuoto.</td></tr>`;
            return;
        }

        sortedCodes.forEach(code => {
            const quantity = inventory[code];
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${code}</td>
                <td>${quantity}</td>
                <td><button class="reset-btn" data-code="${code}"><i class="fa-solid fa-trash"></i> Reset</button></td>
            `;
            inventoryTableBody.appendChild(row);
        });

        document.querySelectorAll('.reset-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const codeToReset = e.currentTarget.dataset.code;
                if (confirm(`Sei sicuro di voler azzerare il conteggio per l'articolo ${codeToReset}?`)) {
                    delete inventory[codeToReset];
                    saveInventory();
                    updateInventoryDisplay();
                }
            });
        });
    };

    const addItem = () => {
        const code = scannedCodeInput.value.trim();
        if (code) {
            inventory[code] = (inventory[code] || 0) + 1;
            saveInventory();
            updateInventoryDisplay();
            scannedCodeInput.value = '';
            scannedCodeInput.style.backgroundColor = '#d4edda';
            setTimeout(() => { scannedCodeInput.style.backgroundColor = '#e9ecef'; }, 500);
        } else {
            alert('Nessun codice da aggiungere.');
        }
    };

    const removeItem = () => {
        const code = scannedCodeInput.value.trim();
        if (code && inventory[code]) {
            inventory[code] -= 1;
            if (inventory[code] <= 0) {
                delete inventory[code];
            }
            saveInventory();
            updateInventoryDisplay();
            scannedCodeInput.value = '';
            scannedCodeInput.style.backgroundColor = '#f8d7da';
            setTimeout(() => { scannedCodeInput.style.backgroundColor = '#e9ecef'; }, 500);
        } else {
            alert('Codice non presente nell\'inventario o campo vuoto.');
        }
    };

    // --- FUNZIONI DI REPORTING ---
    const generatePDF = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text("Report Inventario", 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generato il: ${new Date().toLocaleString('it-IT')}`, 14, 30);

        const tableData = Object.entries(inventory).map(([code, quantity]) => [code, quantity]);

        if (tableData.length === 0) {
            doc.text("L'inventario è vuoto.", 14, 40);
        } else {
            doc.autoTable({
                head: [['Codice Articolo', 'Quantità']],
                body: tableData,
                startY: 35,
                theme: 'grid',
                headStyles: { fillColor: [0, 90, 156] }
            });
        }
        
        doc.save(`report-inventario-${Date.now()}.pdf`);
    };

    const shareReport = async () => {
        if (!navigator.share) {
            alert("La condivisione non è supportata su questo browser/dispositivo.");
            return;
        }

        let reportText = "Report Inventario:\n\n";
        if (Object.keys(inventory).length === 0) {
            reportText += "L'inventario è vuoto.";
        } else {
            for (const [code, quantity] of Object.entries(inventory)) {
                reportText += `- ${code}: ${quantity} pz.\n`;
            }
        }
        
        try {
            await navigator.share({
                title: 'Report Inventario',
                text: reportText,
            });
        } catch (error) {
            console.error('Errore durante la condivisione:', error);
            log(`Errore condivisione: ${error}`);
        }
    };
    
    // --- AGGANCIO EVENTI E AVVIO ---
    startCameraBtn.addEventListener('click', startScanner);
    addBtn.addEventListener('click', addItem);
    removeBtn.addEventListener('click', removeItem);
    exportPdfBtn.addEventListener('click', generatePDF);
    shareBtn.addEventListener('click', shareReport);

    // Carica i dati e avvia tutto
    loadInventory();
    updateInventoryDisplay();
});