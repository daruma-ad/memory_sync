/**
 * Name Recall App MVP - Logic
 * Uses localStorage for data persistence
 */

// --- STATE MANAGEMENT ---
const AppState = {
    people: [],
    currentScreen: 'screen-home',
    filterTag: null,

    // Gradients for avatars
    gradients: [
        'bg-gradient-1', 'bg-gradient-2', 'bg-gradient-3',
        'bg-gradient-4', 'bg-gradient-5', 'bg-gradient-6'
    ]
};

// --- STORAGE ---
const Storage = {
    KEY: 'name-recall-app-data',

    load() {
        const data = localStorage.getItem(this.KEY);
        if (data) {
            AppState.people = JSON.parse(data);
        } else {
            AppState.people = [];
        }
    },

    save() {
        localStorage.setItem(this.KEY, JSON.stringify(AppState.people));
    }
};

// --- DATA MANAGER (Export / Import) ---
const DataManager = {
    pendingImportData: null,

    // Export data as JSON file download
    exportData() {
        if (AppState.people.length === 0) {
            this.showToast('データがありません', 'error');
            return;
        }

        const exportObj = {
            appName: 'anoano',
            version: '1.0',
            exportDate: new Date().toISOString(),
            peopleCount: AppState.people.length,
            data: AppState.people
        };

        const jsonStr = JSON.stringify(exportObj, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const today = new Date().toISOString().split('T')[0];
        const filename = `anoano_backup_${today}.json`;

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast(`✅ ${AppState.people.length}件のデータをエクスポートしました`, 'success');
    },

    // Read and validate import file
    readImportFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target.result);

                // Validate structure
                if (!parsed.data || !Array.isArray(parsed.data)) {
                    this.showToast('❗ 無効なファイル形式です', 'error');
                    return;
                }

                // Validate each person has required fields
                const valid = parsed.data.every(p => p.id && p.name && Array.isArray(p.tags));
                if (!valid) {
                    this.showToast('❗ データ形式が正しくありません', 'error');
                    return;
                }

                this.pendingImportData = parsed.data;
                this.showImportModal(parsed);
            } catch (err) {
                this.showToast('❗ JSONの解析に失敗しました', 'error');
            }
        };
        reader.readAsText(file);
    },

    // Show import modal with preview
    showImportModal(parsed) {
        const preview = document.getElementById('import-preview');
        const importDate = parsed.exportDate
            ? new Date(parsed.exportDate).toLocaleString('ja-JP')
            : '不明';

        // Count new vs existing
        const existingIds = new Set(AppState.people.map(p => p.id));
        const newCount = parsed.data.filter(p => !existingIds.has(p.id)).length;
        const updateCount = parsed.data.filter(p => existingIds.has(p.id)).length;

        preview.innerHTML = `
            <strong>ファイル情報</strong><br>
            📅 エクスポート日: ${importDate}<br>
            👥 人数: ${parsed.data.length}件<br>
            🆕 新規: ${newCount}件　🔄 更新: ${updateCount}件
        `;

        document.getElementById('import-modal').style.display = 'flex';
    },

    hideImportModal() {
        document.getElementById('import-modal').style.display = 'none';
        this.pendingImportData = null;
        // Reset file input
        document.getElementById('input-import-file').value = '';
    },

    // Merge: keep existing, add new, update matched IDs
    importMerge() {
        if (!this.pendingImportData) return;

        const existingMap = new Map(AppState.people.map(p => [p.id, p]));
        let addedCount = 0;
        let updatedCount = 0;

        this.pendingImportData.forEach(imported => {
            if (existingMap.has(imported.id)) {
                // Update existing
                const idx = AppState.people.findIndex(p => p.id === imported.id);
                if (idx !== -1) {
                    AppState.people[idx] = imported;
                    updatedCount++;
                }
            } else {
                // Add new
                AppState.people.push(imported);
                addedCount++;
            }
        });

        Storage.save();
        this.hideImportModal();
        UI.renderPeopleList();
        this.updateStats();
        this.showToast(`✅ ${addedCount}件追加、${updatedCount}件更新しました`, 'success');
    },

    // Overwrite: replace all data
    importOverwrite() {
        if (!this.pendingImportData) return;

        if (!confirm(`⚠️ 現在の${AppState.people.length}件のデータがすべて置き換えられます。\nよろしいですか？`)) {
            return;
        }

        const count = this.pendingImportData.length;
        AppState.people = [...this.pendingImportData];
        Storage.save();
        this.hideImportModal();
        UI.renderPeopleList();
        this.updateStats();
        this.showToast(`✅ ${count}件のデータに置き換えました`, 'success');
    },

    // Update settings stats display
    updateStats() {
        document.getElementById('stat-people-count').textContent = AppState.people.length;
        document.getElementById('stat-tags-count').textContent = Utils.getAllUniqueTags().length;

        const dataStr = localStorage.getItem(Storage.KEY) || '';
        const sizeKB = (new Blob([dataStr]).size / 1024).toFixed(1);
        document.getElementById('stat-data-size').textContent = `${sizeKB} KB`;
    },

    // Toast notification
    showToast(message, type = 'success') {
        // Remove any existing toast
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }
};

// --- UTILS ---
const Utils = {
    generateId() {
        return Math.random().toString(36).substr(2, 9);
    },

    getInitials(name) {
        if (!name) return '?';
        const parts = name.trim().split(/\s+/);
        if (parts.length > 1) {
            return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
        }
        return name.charAt(0).toUpperCase();
    },

    getRandomGradient() {
        const index = Math.floor(Math.random() * AppState.gradients.length);
        return AppState.gradients[index];
    },

    parseTags(tagString) {
        if (!tagString || !tagString.trim()) return [];
        return tagString.split(',')
            .map(t => t.trim())
            .filter(t => t.length > 0);
    },

    compressImage(file, callback, errorCallback) {
        const reader = new FileReader();
        reader.onerror = () => {
            if (errorCallback) errorCallback('画像ファイルの読み込みに失敗しました。');
        };
        reader.onload = (e) => {
            const img = new Image();
            img.onerror = () => {
                if (errorCallback) errorCallback('対応していない画像形式か、データが破損しています。\n(※iPhoneの高画質設定等の場合は、ブラウザが対応していない可能性があります)');
            };
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const targetSize = 256;
                canvas.width = targetSize;
                canvas.height = targetSize;
                const ctx = canvas.getContext('2d');

                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, targetSize, targetSize);

                const size = Math.min(img.width, img.height);
                const sx = (img.width - size) / 2;
                const sy = (img.height - size) / 2;

                ctx.drawImage(img, sx, sy, size, size, 0, 0, targetSize, targetSize);

                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                callback(dataUrl);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    },

    getAllUniqueTags() {
        const tagSet = new Set();
        AppState.people.forEach(p => {
            p.tags.forEach(t => tagSet.add(t));
        });
        return Array.from(tagSet).sort();
    }
};

// --- UI CONTROLLER ---
const UI = {
    // Navigate between screens
    navigateTo(screenId) {
        document.querySelectorAll('.screen').forEach(el => {
            el.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
        AppState.currentScreen = screenId;

        // Triggers based on screen
        if (screenId === 'screen-home') {
            this.renderPeopleList();
            document.getElementById('search-input').value = '';
        } else if (screenId === 'screen-tags') {
            this.renderAllTags();
        }

        // Scroll to top
        document.querySelector('.app-main').scrollTo(0, 0);
    },

    // Render the main list of people
    renderPeopleList(searchQuery = '') {
        const container = document.getElementById('people-list');
        const emptyState = document.getElementById('empty-state');

        container.innerHTML = '';

        // Filter logic
        let filteredPeople = AppState.people;

        // 1. Tag Filter
        if (AppState.filterTag) {
            filteredPeople = filteredPeople.filter(p => p.tags.includes(AppState.filterTag));
            document.getElementById('filter-status').style.display = 'flex';
            document.getElementById('current-filter-tag').innerHTML = `#${AppState.filterTag} <i class="fa-solid fa-xmark"></i>`;
        } else {
            document.getElementById('filter-status').style.display = 'none';
        }

        // 2. Search Box Filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filteredPeople = filteredPeople.filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.tags.some(tag => tag.toLowerCase().includes(query)) ||
                (p.memo && p.memo.toLowerCase().includes(query))
            );
        }

        // Display check
        if (filteredPeople.length === 0) {
            emptyState.style.display = 'flex';
            if (AppState.people.length > 0) {
                // Not totally empty, just search yielded no results
                emptyState.querySelector('h3').textContent = '見つかりませんでした';
                emptyState.querySelector('p').textContent = '検索条件を変えてみてください';
            } else {
                emptyState.querySelector('h3').textContent = 'まだ誰も登録されていません';
                emptyState.querySelector('p').textContent = '右上の＋ボタンから新しい人を追加しましょう';
            }
            container.appendChild(emptyState);
            return;
        }

        emptyState.style.display = 'none';
        container.appendChild(emptyState); // Keep it around but hidden

        // Render cards
        filteredPeople.forEach((person, index) => {
            const delay = index * 0.05; // Staggered animation

            const card = document.createElement('div');
            card.className = 'person-card glass-panel animate-slide-up';
            card.style.animationDelay = `${delay}s`;
            card.onclick = () => this.showDetail(person.id);

            const tagsHtml = person.tags.slice(0, 3).map(tag =>
                `<span class="tag-badge">#${tag}</span>`
            ).join('');

            const moreTags = person.tags.length > 3 ?
                `<span class="tag-badge" style="background: transparent; border: none; padding-left:0;">+${person.tags.length - 3}</span>` : '';

            const avatarHtml = person.avatar
                ? `<div class="card-avatar" style="background-image: url(${person.avatar}); background-size: cover; background-position: center;"></div>`
                : `<div class="card-avatar ${person.colorVariant}">${Utils.getInitials(person.name)}</div>`;

            card.innerHTML = `
                ${avatarHtml}
                <div class="card-info">
                    <h3 class="card-name">${person.name}</h3>
                    <div class="card-tags">
                        ${tagsHtml}
                        ${moreTags}
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    },

    // Render tag cloud in Add Form
    renderFormTags(tagsString) {
        const container = document.getElementById('tag-preview-container');
        const tags = Utils.parseTags(tagsString);
        container.innerHTML = tags.map(tag => `<span class="tag-badge active">#${tag}</span>`).join('');
    },

    // Render detail view
    showDetail(personId) {
        const person = AppState.people.find(p => p.id === personId);
        if (!person) return;

        // Populate detail screen
        const avatarEl = document.getElementById('detail-avatar');
        if (person.avatar) {
            avatarEl.className = 'detail-avatar';
            avatarEl.style.backgroundImage = `url(${person.avatar})`;
            avatarEl.style.backgroundSize = 'cover';
            avatarEl.style.backgroundPosition = 'center';
            avatarEl.textContent = '';
        } else {
            avatarEl.className = `detail-avatar ${person.colorVariant}`;
            avatarEl.style.backgroundImage = '';
            avatarEl.textContent = Utils.getInitials(person.name);
        }

        document.getElementById('detail-name').textContent = person.name;

        document.getElementById('detail-tags').innerHTML = person.tags.map(tag =>
            `<span class="tag-badge active">#${tag}</span>`
        ).join('');

        const memoEl = document.getElementById('detail-memo');
        memoEl.textContent = person.memo || 'メモはありません';
        memoEl.style.color = person.memo ? 'var(--text-primary)' : 'var(--text-secondary)';
        memoEl.style.fontStyle = person.memo ? 'normal' : 'italic';

        // Set action buttons handlers
        document.getElementById('btn-edit-person').onclick = () => this.openForm(person);
        document.getElementById('btn-delete-person').onclick = () => this.deletePerson(person.id);

        this.navigateTo('screen-detail');
    },

    // Open form for Add or Edit
    openForm(personToEdit = null) {
        const formTitle = document.getElementById('form-title');
        const formId = document.getElementById('form-id');
        const inputName = document.getElementById('input-name');
        const inputTags = document.getElementById('input-tags');
        const inputMemo = document.getElementById('input-memo');
        const inputAvatarBase64 = document.getElementById('input-avatar-base64');
        const inputAvatarFile = document.getElementById('input-avatar');
        const avatarPreview = document.getElementById('avatar-preview');
        const avatarPreviewIcon = document.getElementById('avatar-preview-icon');

        if (inputAvatarFile) inputAvatarFile.value = '';

        if (personToEdit) {
            formTitle.textContent = '情報を編集';
            formId.value = personToEdit.id;
            inputName.value = personToEdit.name;
            inputTags.value = personToEdit.tags.join(', ');
            inputMemo.value = personToEdit.memo;
            inputAvatarBase64.value = personToEdit.avatar || '';

            if (personToEdit.avatar) {
                avatarPreview.style.backgroundImage = `url(${personToEdit.avatar})`;
                avatarPreview.style.backgroundSize = 'cover';
                avatarPreview.style.backgroundPosition = 'center';
                avatarPreviewIcon.style.display = 'none';
            } else {
                avatarPreview.style.backgroundImage = '';
                avatarPreviewIcon.style.display = 'block';
            }
        } else {
            formTitle.textContent = '新しい人を追加';
            formId.value = '';
            inputName.value = '';
            inputTags.value = '';
            inputMemo.value = '';
            inputAvatarBase64.value = '';
            avatarPreview.style.backgroundImage = '';
            avatarPreviewIcon.style.display = 'block';
        }

        this.renderFormTags(inputTags.value);
        this.navigateTo('screen-form');
        setTimeout(() => inputName.focus(), 300);
    },

    // Save person from form
    savePerson(e) {
        e.preventDefault();

        const id = document.getElementById('form-id').value;
        const name = document.getElementById('input-name').value;
        const tagsStr = document.getElementById('input-tags').value;
        const memo = document.getElementById('input-memo').value;
        const avatarBase64 = document.getElementById('input-avatar-base64').value;

        const personData = {
            id: id || Utils.generateId(),
            name: name,
            tags: Utils.parseTags(tagsStr),
            memo: memo,
            avatar: avatarBase64 || null,
            colorVariant: id ? AppState.people.find(p => p.id === id).colorVariant : Utils.getRandomGradient(),
            updatedAt: new Date().toISOString()
        };

        if (id) {
            // Edit
            const index = AppState.people.findIndex(p => p.id === id);
            if (index !== -1) AppState.people[index] = personData;
        } else {
            // Add new
            AppState.people.unshift(personData); // Add to top
        }

        Storage.save();

        // Go back to home or detail
        this.navigateTo('screen-home');
    },

    // Delete person
    deletePerson(id) {
        if (confirm('本当にこの人を削除しますか？')) {
            AppState.people = AppState.people.filter(p => p.id !== id);
            Storage.save();
            this.navigateTo('screen-home');
        }
    },

    // Render all tags screen
    renderAllTags() {
        const container = document.getElementById('all-tags-list');
        const emptyState = document.getElementById('tags-empty-state');
        const tags = Utils.getAllUniqueTags();

        container.innerHTML = '';
        container.appendChild(emptyState); // Keep reference

        if (tags.length === 0) {
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';

        tags.forEach((tag, index) => {
            const badge = document.createElement('span');
            badge.className = 'tag-badge animate-slide-up';
            badge.style.animationDelay = `${index * 0.03}s`;
            badge.textContent = `#${tag}`;

            // Get count of people with this tag
            const count = AppState.people.filter(p => p.tags.includes(tag)).length;

            const countSpan = document.createElement('span');
            countSpan.style.opacity = '0.7';
            countSpan.style.fontSize = '0.8em';
            countSpan.style.marginLeft = '6px';
            countSpan.textContent = `(${count})`;
            badge.appendChild(countSpan);

            badge.onclick = () => {
                AppState.filterTag = tag;
                this.navigateTo('screen-home');
            };

            container.appendChild(badge);
        });
    },

    // Setup clear filter event
    clearFilter() {
        AppState.filterTag = null;
        this.renderPeopleList(document.getElementById('search-input').value);
    }
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    Storage.load();

    // Setup Event Listeners

    // Header actions
    document.getElementById('btn-add-person').addEventListener('click', () => UI.openForm());
    document.getElementById('btn-show-tags').addEventListener('click', () => UI.navigateTo('screen-tags'));
    document.getElementById('btn-show-settings').addEventListener('click', () => {
        DataManager.updateStats();
        UI.navigateTo('screen-settings');
    });

    // Form actions
    document.getElementById('person-form').addEventListener('submit', (e) => UI.savePerson(e));
    document.getElementById('input-tags').addEventListener('input', (e) => UI.renderFormTags(e.target.value));

    // Image Upload
    document.getElementById('input-avatar').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            Utils.compressImage(file, (base64) => {
                document.getElementById('input-avatar-base64').value = base64;
                const preview = document.getElementById('avatar-preview');
                preview.style.backgroundImage = `url(${base64})`;
                preview.style.backgroundSize = 'cover';
                preview.style.backgroundPosition = 'center';
                document.getElementById('avatar-preview-icon').style.display = 'none';
            }, (errorMsg) => {
                alert(errorMsg);
                e.target.value = '';
            });
        }
    });

    // Back buttons
    document.getElementById('btn-back-form').addEventListener('click', () => UI.navigateTo('screen-home'));
    document.getElementById('btn-back-detail').addEventListener('click', () => UI.navigateTo('screen-home'));
    document.getElementById('btn-back-tags').addEventListener('click', () => UI.navigateTo('screen-home'));
    document.getElementById('btn-back-settings').addEventListener('click', () => UI.navigateTo('screen-home'));

    // Search
    document.getElementById('search-input').addEventListener('input', (e) => UI.renderPeopleList(e.target.value));

    // Filter clear
    document.getElementById('current-filter-tag').addEventListener('click', () => UI.clearFilter());

    // --- Settings: Export / Import ---
    document.getElementById('btn-export').addEventListener('click', () => DataManager.exportData());

    document.getElementById('btn-import').addEventListener('click', () => {
        document.getElementById('input-import-file').click();
    });

    document.getElementById('input-import-file').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) DataManager.readImportFile(file);
    });

    // Import modal buttons
    document.getElementById('btn-import-merge').addEventListener('click', () => DataManager.importMerge());
    document.getElementById('btn-import-overwrite').addEventListener('click', () => DataManager.importOverwrite());
    document.getElementById('btn-import-cancel').addEventListener('click', () => DataManager.hideImportModal());

    // Initial Render
    UI.navigateTo('screen-home');
});
