// =============================================
// CONFIGURATION : Liste des codes DMI à exclure
// =============================================
const DMI_CODES = ['01', '11', '20', '21', '240', '94', '95', '96', '97', '98', '99'];

// =============================================
// FONCTIONS UTILITAIRES
// =============================================
function log(message, type = 'info') {
    const debugLog = document.getElementById('debug-log');
    if (debugLog) {
        const line = document.createElement('div');
        line.className = `debug-line ${type}`;
        line.textContent = message;
        debugLog.appendChild(line);
        debugLog.scrollTop = debugLog.scrollHeight;
    }
    console.log(`[DMI ${type.toUpperCase()}] ${message}`);
}

function clearLogs() {
    const debugLog = document.getElementById('debug-log');
    if (debugLog) debugLog.innerHTML = '';
}

// =============================================
// EXTRACTION DU NUMÉRO DE SÉRIE (Version corrigée)
// =============================================
function extractSerial(text) {
    log(`Analyse du code: ${text}`, 'info');

    if (!text || text.length < 2) {
        log("Texte trop court ou vide", 'error');
        return null;
    }

    // Parcourir de droite à gauche pour trouver "21"
    for (let i = text.length - 2; i >= 0; i--) {
        const substring = text.substring(i, i + 2);

        if (substring === '21') {
            const nextChar = text[i + 2];
            // Ignorer 217 et 211
            if (nextChar === '7' || nextChar === '1') {
                log(`"21${nextChar}" ignoré`, 'error');
                continue;
            }

            const startIndex = i + 2;
            const afterPrefix = text.substring(startIndex);
            log(`"21" valide trouvé à la position ${i}. Texte après: "${afterPrefix}"`, 'success');

            // Extraire TOUT ce qui suit (chiffres ET lettres)
            const serialMatch = afterPrefix.match(/^([A-Za-z0-9]+)/);
            if (!serialMatch) {
                log("Aucun caractère alphanumérique après ce '21'", 'error');
                continue;
            }

            let serial = serialMatch[1];
            log(`Série alphanumérique extraite: ${serial}`, 'info');

            // S'arrêter UNIQUEMENT si un code DMI apparaît APRES au moins 5 caractères
            if (serial.length > 5) {
                let stopIndex = serial.length;
                for (const code of DMI_CODES) {
                    // Chercher le code DMI à partir de la position 5 pour éviter les faux positifs
                    const index = serial.indexOf(code, 5);
                    if (index !== -1 && index < stopIndex) {
                        stopIndex = index;
                        log(`Code DMI "${code}" trouvé à la position ${index}`, 'success');
                    }
                }
                serial = serial.substring(0, stopIndex);
            }

            if (serial && serial.length >= 6) {  // On ne retourne que les numéros d'au moins 6 caractères
                log(`✅ Résultat final: ${serial}`, 'success');
                return serial;
            }
        }
    }

    // Essayer avec (21)
    const prefixMatch = text.match(/(\(21\))/);
    if (prefixMatch) {
        const startIndex = prefixMatch.index + prefixMatch[0].length;
        const afterPrefix = text.substring(startIndex);
        const serialMatch = afterPrefix.match(/^([A-Za-z0-9]+)/);
        if (serialMatch) {
            let serial = serialMatch[1];
            if (serial.length > 5) {
                let stopIndex = serial.length;
                for (const code of DMI_CODES) {
                    const index = serial.indexOf(code, 5);
                    if (index !== -1 && index < stopIndex) {
                        stopIndex = index;
                    }
                }
                serial = serial.substring(0, stopIndex);
            }
            if (serial && serial.length >= 6) {
                log(`✅ Résultat final (avec parenthèses): ${serial}`, 'success');
                return serial;
            }
        }
    }

    log("❌ Aucun numéro de série valide trouvé", 'error');
    return null;
}

// =============================================
// COPIE DANS LE PRESSE-PAPIERS
// =============================================
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        log(`Copié dans le presse-papiers: ${text}`, 'success');
        return true;
    } catch (err) {
        log(`Erreur lors de la copie: ${err}`, 'error');
        return false;
    }
}

// =============================================
// AFFICHAGE DU RÉSULTAT
// =============================================
function showResult(serial) {
    const resultDiv = document.getElementById('result');
    if (resultDiv) {
        if (serial) {
            resultDiv.textContent = `✅ Copié: ${serial}`;
            resultDiv.className = 'success';
        } else {
            resultDiv.textContent = "❌ Aucun numéro de série trouvé";
            resultDiv.className = 'error';
        }
    }
}

// =============================================
// GESTION DE L'EXTRACTION
// =============================================
async function handleExtraction() {
    clearLogs();
    log("=== NOUVELLE EXTRACTION ===", 'info');

    const input = document.getElementById('input');
    if (!input) {
        log("❌ Champ input introuvable !", 'error');
        return;
    }

    const inputValue = input.value.trim();
    log(`Valeur du champ: ${inputValue}`, 'info');

    if (!inputValue) {
        log("⚠️ Champ vide", 'error');
        showResult(null);
        return;
    }

    const serial = extractSerial(inputValue);
    if (serial) {
        const copied = await copyToClipboard(serial);
        showResult(copied ? serial : null);
    } else {
        showResult(null);
    }
}

// =============================================
// INITIALISATION DE L'EXTENSION
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    log("🚀 Extension DMI Serial Extractor chargée et prête !", 'success');

    const extractBtn = document.getElementById('extract');
    const clearBtn = document.getElementById('clear');
    const inputField = document.getElementById('input');

    if (extractBtn) {
        extractBtn.addEventListener('click', handleExtraction);
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (inputField) {
                inputField.value = '';
                const resultDiv = document.getElementById('result');
                if (resultDiv) {
                    resultDiv.textContent = '';
                    resultDiv.className = '';
                }
                clearLogs();
                log("🗑️ Champ effacé", 'info');
                inputField.focus();
            }
        });
    }

    if (inputField) {
        let timeout;
        inputField.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(handleExtraction, 500);
        });
        inputField.focus();
    }
});