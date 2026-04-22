const browserAPI = (typeof browser !== 'undefined') ? browser : chrome;

document.addEventListener('DOMContentLoaded', () => {
    const contentDiv = document.getElementById('content');

    const loadKB = () => {
        browserAPI.storage.local.get(['knowledge_base', 'pretrained_context']).then((res) => {
            const kb = res.knowledge_base || [];
            const pretrained = res.pretrained_context || '';
            
            let html = '';
            
            // Show pre-trained knowledge
            if (pretrained) {
                html += `<h3 style="color: #2980B9; margin-top: 0;">Pre-trained Knowledge</h3>`;
                html += `<div class="entry pretrained">${pretrained.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`;
            }
            
            // Show learned knowledge
            html += `<h3 style="color: #27AE60;">Learned Knowledge (${kb.length} entries)</h3>`;
            if (kb.length === 0) {
                html += '<p style="color: #888;">No learned knowledge yet. Use "Train Knowledge Base" to add.</p>';
            } else {
                html += kb.map((entry, i) => `
                    <div class="entry">
                        <strong style="display:block; margin-bottom:5px; color:#888;">Entry ${i+1}</strong>
                        ${entry.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
                    </div>
                `).join('');
            }
            
            contentDiv.innerHTML = html;
        });
    };
    
    loadKB();

    // Export Logic
    document.getElementById('exportBtn').addEventListener('click', () => {
        browserAPI.storage.local.get('knowledge_base').then((res) => {
            const kb = res.knowledge_base || [];
            if (kb.length === 0) {
                alert('Nothing to export.');
                return;
            }
            
            const content = kb.join("\n\n---\n\n");
            const blob = new Blob([content], {type: 'text/markdown'});
            const url = URL.createObjectURL(blob);
            
            browserAPI.downloads.download({
                url: url,
                filename: 'forti_knowledge_base.md',
                saveAs: true
            });
        });
    });

    // Import Logic
    const importBtn = document.getElementById('importBtn');
    const fileInput = document.getElementById('importFile');
    
    importBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            let newEntries = [];
            if (content.includes("\n\n---\n\n")) {
                newEntries = content.split("\n\n---\n\n");
            } else {
                newEntries = [content];
            }
            
            newEntries = newEntries.map(s => s.trim()).filter(s => s.length > 0);
            
            browserAPI.storage.local.get('knowledge_base').then((res) => {
                const currentKb = res.knowledge_base || [];
                const updatedKb = [...currentKb, ...newEntries];
                
                browserAPI.storage.local.set({ knowledge_base: updatedKb }).then(() => {
                    alert(`Imported ${newEntries.length} entries.`);
                    loadKB();
                });
            });
        };
        reader.readAsText(file);
        fileInput.value = '';
    });

    // Clear Knowledge (learned only)
    document.getElementById('clearBtn').addEventListener('click', () => {
        if (confirm('Clear all learned knowledge?\n\nPre-trained knowledge will remain.')) {
            browserAPI.storage.local.set({ knowledge_base: [] }).then(() => {
                alert('Learned knowledge cleared.');
                loadKB();
            });
        }
    });

    // Purge All Data
    document.getElementById('purgeBtn').addEventListener('click', () => {
        if (confirm('⚠️ PURGE ALL DATA?\n\nThis will delete:\n• All API keys\n• All learned knowledge\n• All settings\n\nYou will need to reconfigure the extension.')) {
            browserAPI.storage.local.clear().then(() => {
                alert('All data purged!');
                loadKB();
            });
        }
    });
});