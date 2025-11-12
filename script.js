// Notes array to store all notes
let notes = [];
let currentFilter = 'all';
let currentDate = new Date();
let selectedDateValue = null;
let currentSort = 'date-desc';
let searchQuery = '';
let isDarkMode = false;
let currentEmojiTarget = null;

// Emoji list
const emojis = ['😊', '😍', '🥰', '😘', '😂', '😭', '😱', '🥺', '😇', '🤗', '🤔', '😴', '🤩', '😎', '🤯', '🥳', '😋', '🤤', '❤️', '💕', '💖', '💗', '💓', '💞', '💝', '🌸', '🌺', '🌻', '🌼', '🌷', '🌹', '🌿', '🍀', '🎀', '🎁', '🎂', '🎉', '🎊', '🎈', '⭐', '🌟', '✨', '💫', '⚡', '🔥', '💥', '🍪', '🧁', '🍰', '🎂', '🍮', '🍩', '🍭', '🍬', '🍫', '🍿', '🧃', '☕', '🍵'];

// Load settings and notes from localStorage
document.addEventListener('DOMContentLoaded', () => {
    // Show splash screen
    showSplashScreen();
    
    // Load app after splash
    setTimeout(() => {
        loadSettings();
        loadNotes();
        renderCalendar();
        renderNotes();
        setupEventListeners();
        requestNotificationPermission();
        checkReminders();
        setInterval(checkReminders, 60000); // Check every minute
        
        // Hide splash screen
        hideSplashScreen();
    }, 2800);
});

// Show splash screen
function showSplashScreen() {
    const splash = document.getElementById('splashScreen');
    if (splash) {
        splash.style.display = 'flex';
    }
}

// Hide splash screen
function hideSplashScreen() {
    const splash = document.getElementById('splashScreen');
    if (splash) {
        splash.classList.add('fade-out');
        setTimeout(() => {
            splash.style.display = 'none';
        }, 800);
    }
}

// Load settings
function loadSettings() {
    isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        const moonIcon = document.querySelector('.btn-dark-mode i');
        if (moonIcon) moonIcon.className = 'fas fa-sun';
    }
}

// Setup all event listeners
function setupEventListeners() {
    // Add note form
    document.getElementById('noteForm').addEventListener('submit', (e) => {
        e.preventDefault();
        addNote();
    });

    // Edit note form
    document.getElementById('editForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveEdit();
    });

    // Filter buttons
    document.querySelectorAll('.btn-filter').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentFilter = e.target.dataset.filter;
            
            // Update active state
            document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            renderNotes();
        });
    });
}

// Load notes from localStorage
function loadNotes() {
    const savedNotes = localStorage.getItem('cookieNotes');
    if (savedNotes) {
        notes = JSON.parse(savedNotes);
    }
}

// Save notes to localStorage
function saveNotes() {
    localStorage.setItem('cookieNotes', JSON.stringify(notes));
}

// Add new note
function addNote() {
    const title = document.getElementById('noteTitle').value.trim();
    const content = document.getElementById('noteContent').value.trim();
    const category = document.getElementById('noteCategory').value;
    const priority = document.getElementById('notePriority').value;
    const time = document.getElementById('noteTime').value;
    const tags = document.getElementById('noteTags').value;
    const selectedDate = document.getElementById('selectedDate').value;
    const imageInput = document.getElementById('noteImage');
    
    if (!title || !content) {
        showAlert('Lütfen başlık ve içerik alanlarını doldurun! 🍪', 'warning');
        return;
    }

    const note = {
        id: Date.now(),
        title,
        content,
        category,
        priority,
        time,
        tags: tags ? tags.split(',').map(t => t.trim()).filter(t => t) : [],
        date: new Date().toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }),
        dateValue: selectedDate || new Date().toISOString().split('T')[0],
        timestamp: Date.now(),
        pinned: false,
        image: null
    };

    // Handle image
    if (imageInput.files && imageInput.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            note.image = e.target.result;
            notes.unshift(note);
            saveNotes();
            renderNotes();
            renderCalendar();
            updateStatistics();
        };
        reader.readAsDataURL(imageInput.files[0]);
    } else {
        notes.unshift(note);
        saveNotes();
        renderNotes();
        renderCalendar();
        updateStatistics();
    }

    // Clear form and close
    document.getElementById('noteForm').reset();
    clearSelectedDate();
    removeImage();
    
    // Hide form after adding note
    setTimeout(() => {
        document.getElementById('addNoteCard').style.display = 'none';
    }, 500);
    
    showAlert('Not başarıyla eklendi! 💕', 'success');
}

// Render notes
function renderNotes() {
    const container = document.getElementById('notesContainer');
    const emptyState = document.getElementById('emptyState');
    
    // Filter notes
    let filteredNotes = notes;
    
    // Apply search
    if (searchQuery) {
        filteredNotes = filteredNotes.filter(note => 
            note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
            note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }
    
    // Apply category/date filter
    if (currentFilter !== 'all') {
        if (currentFilter === 'today') {
            const today = new Date().toISOString().split('T')[0];
            filteredNotes = filteredNotes.filter(note => note.dateValue === today);
        } else if (currentFilter === 'week') {
            const today = new Date();
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            filteredNotes = filteredNotes.filter(note => {
                const noteDate = new Date(note.dateValue);
                return noteDate >= weekAgo && noteDate <= today;
            });
        } else if (currentFilter === 'pinned') {
            filteredNotes = filteredNotes.filter(note => note.pinned);
        } else {
            filteredNotes = filteredNotes.filter(note => note.category === currentFilter);
        }
    }
    
    // Sort notes
    filteredNotes = sortNotesArray(filteredNotes);

    if (filteredNotes.length === 0) {
        container.innerHTML = '';
        emptyState.classList.add('show');
        return;
    }

    emptyState.classList.remove('show');

    const categoryEmojis = {
        'kişisel': '💕',
        'önemli': '⭐',
        'hatırlatma': '🔔',
        'alışveriş': '🛍️',
        'diğer': '🍪'
    };

    container.innerHTML = filteredNotes.map(note => `
        <div class="note-item priority-${note.priority} ${note.pinned ? 'pinned' : ''}" data-id="${note.id}">
            ${note.pinned ? '<div class="note-pin-badge">📌</div>' : ''}
            <div class="note-header">
                <h4 class="note-title">${escapeHtml(note.title)}</h4>
                <span class="note-category">${categoryEmojis[note.category] || '🍪'}</span>
            </div>
            ${note.image ? `<img src="${note.image}" alt="Note image" class="note-image">` : ''}
            <p class="note-content">${escapeHtml(note.content)}</p>
            ${note.tags.length > 0 ? `
                <div class="note-tags">
                    ${note.tags.map(tag => `<span class="note-tag">🏷️ ${escapeHtml(tag)}</span>`).join('')}
                </div>
            ` : ''}
            <div class="note-date">
                ${note.time ? `<span class="note-time">⏰ ${note.time}</span>` : ''}
                <i class="fas fa-clock"></i> ${note.date}
            </div>
            <div class="note-actions">
                <button class="btn-action btn-pin" onclick="togglePin(${note.id})">
                    <i class="fas fa-thumbtack"></i> ${note.pinned ? 'Çıkar' : 'Sabitle'}
                </button>
                <button class="btn-action btn-edit" onclick="editNote(${note.id})">
                    <i class="fas fa-edit"></i> Düzenle
                </button>
                <button class="btn-action btn-delete" onclick="deleteNote(${note.id})">
                    <i class="fas fa-trash"></i> Sil
                </button>
            </div>
        </div>
    `).join('');
}

// Sort notes array
function sortNotesArray(notesArray) {
    const sorted = [...notesArray];
    
    // Always show pinned first
    sorted.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        
        switch(currentSort) {
            case 'date-desc':
                return b.timestamp - a.timestamp;
            case 'date-asc':
                return a.timestamp - b.timestamp;
            case 'title-asc':
                return a.title.localeCompare(b.title, 'tr');
            case 'title-desc':
                return b.title.localeCompare(a.title, 'tr');
            case 'priority':
                const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            default:
                return b.timestamp - a.timestamp;
        }
    });
    
    return sorted;
}

// Search notes
function searchNotes() {
    searchQuery = document.getElementById('searchInput').value;
    const clearBtn = document.querySelector('.btn-clear-search');
    
    if (searchQuery) {
        clearBtn.style.display = 'block';
    } else {
        clearBtn.style.display = 'none';
    }
    
    renderNotes();
}

// Clear search
function clearSearch() {
    searchQuery = '';
    document.getElementById('searchInput').value = '';
    document.querySelector('.btn-clear-search').style.display = 'none';
    renderNotes();
}

// Sort notes
function sortNotes() {
    currentSort = document.getElementById('sortSelect').value;
    renderNotes();
}

// Toggle pin
function togglePin(id) {
    const note = notes.find(n => n.id === id);
    if (note) {
        note.pinned = !note.pinned;
        saveNotes();
        renderNotes();
        updateStatistics();
        showAlert(note.pinned ? 'Not sabitlendi! 📌' : 'Sabitleme kaldırıldı! 📌', 'success');
    }
}

// Edit note
function editNote(id) {
    const note = notes.find(n => n.id === id);
    if (!note) return;

    document.getElementById('editNoteId').value = note.id;
    document.getElementById('editTitle').value = note.title;
    document.getElementById('editContent').value = note.content;
    document.getElementById('editCategory').value = note.category;
    document.getElementById('editPriority').value = note.priority || 'medium';
    document.getElementById('editTime').value = note.time || '';
    document.getElementById('editDate').value = note.dateValue;
    document.getElementById('editTags').value = note.tags.join(', ');

    const modal = new bootstrap.Modal(document.getElementById('editModal'));
    modal.show();
}

// Save edited note
function saveEdit() {
    const id = parseInt(document.getElementById('editNoteId').value);
    const title = document.getElementById('editTitle').value.trim();
    const content = document.getElementById('editContent').value.trim();
    const category = document.getElementById('editCategory').value;
    const priority = document.getElementById('editPriority').value;
    const time = document.getElementById('editTime').value;
    const dateValue = document.getElementById('editDate').value;
    const tags = document.getElementById('editTags').value;

    if (!title || !content) {
        showAlert('Lütfen başlık ve içerik alanlarını doldurun! 🍪', 'warning');
        return;
    }

    const noteIndex = notes.findIndex(n => n.id === id);
    if (noteIndex !== -1) {
        notes[noteIndex].title = title;
        notes[noteIndex].content = content;
        notes[noteIndex].category = category;
        notes[noteIndex].priority = priority;
        notes[noteIndex].time = time;
        notes[noteIndex].dateValue = dateValue;
        notes[noteIndex].tags = tags ? tags.split(',').map(t => t.trim()).filter(t => t) : [];
        
        saveNotes();
        renderNotes();
        renderCalendar();
        updateStatistics();

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editModal'));
        modal.hide();

        showAlert('Not başarıyla güncellendi! 💕', 'success');
    }
}

// Delete note
function deleteNote(id) {
    if (!confirm('Bu notu silmek istediğinize emin misiniz? 🥺')) {
        return;
    }

    notes = notes.filter(note => note.id !== id);
    saveNotes();
    renderNotes();
    renderCalendar();
    updateStatistics();

    showAlert('Not silindi! 🗑️', 'info');
}

// Show alert notification
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} position-fixed top-0 start-50 translate-middle-x mt-3`;
    alertDiv.style.cssText = `
        z-index: 9999;
        min-width: 300px;
        background: linear-gradient(135deg, #ff69b4 0%, #ff1493 100%);
        color: white;
        border: 3px solid white;
        border-radius: 20px;
        font-weight: 600;
        box-shadow: 0 10px 30px rgba(255, 105, 180, 0.4);
        animation: slideDown 0.5s ease;
    `;
    alertDiv.textContent = message;

    document.body.appendChild(alertDiv);

    setTimeout(() => {
        alertDiv.style.animation = 'slideUp 0.5s ease';
        setTimeout(() => alertDiv.remove(), 500);
    }, 3000);
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from {
            transform: translate(-50%, -100%);
            opacity: 0;
        }
        to {
            transform: translate(-50%, 0);
            opacity: 1;
        }
    }
    
    @keyframes slideUp {
        from {
            transform: translate(-50%, 0);
            opacity: 1;
        }
        to {
            transform: translate(-50%, -100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Calendar Functions
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
                        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();
    
    let firstDayOfWeek = firstDay.getDay() - 1;
    if (firstDayOfWeek === -1) firstDayOfWeek = 6;
    
    const prevMonthDays = new Date(year, month, 0).getDate();
    
    const calendarDays = document.getElementById('calendarDays');
    calendarDays.innerHTML = '';
    
    // Add previous month's days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const day = prevMonthDays - i;
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day other-month';
        dayDiv.textContent = day;
        calendarDays.appendChild(dayDiv);
    }
    
    // Add current month's days
    const today = new Date();
    for (let day = 1; day <= totalDays; day++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        
        const dateValue = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
            dayDiv.classList.add('today');
        }
        
        if (dateValue === selectedDateValue) {
            dayDiv.classList.add('selected');
        }
        
        const notesForDay = notes.filter(note => note.dateValue === dateValue);
        if (notesForDay.length > 0) {
            dayDiv.classList.add('has-notes');
            if (notesForDay.length > 1) {
                const countSpan = document.createElement('span');
                countSpan.className = 'note-count';
                countSpan.textContent = notesForDay.length;
                dayDiv.appendChild(countSpan);
            }
        }
        
        dayDiv.innerHTML += day;
        dayDiv.onclick = () => selectDate(dateValue, day, month, year);
        calendarDays.appendChild(dayDiv);
    }
    
    // Add next month's days
    const totalCells = calendarDays.children.length;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let day = 1; day <= remainingCells; day++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day other-month';
        dayDiv.textContent = day;
        calendarDays.appendChild(dayDiv);
    }
}

function previousMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
}

function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
}

function selectDate(dateValue, day, month, year) {
    selectedDateValue = dateValue;
    
    const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
                        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    const dateText = `${day} ${monthNames[month]} ${year}`;
    
    // Check if there are notes for this day
    const notesForDay = notes.filter(note => note.dateValue === dateValue);
    
    if (notesForDay.length > 0) {
        // Show notes in modal
        showDayNotes(dateValue, dateText, notesForDay);
    } else {
        // No notes, show add form
        document.getElementById('selectedDate').value = dateValue;
        document.getElementById('selectedDateText').textContent = dateText;
        document.getElementById('selectedDateDisplay').style.display = 'block';
        
        const noteCard = document.getElementById('addNoteCard');
        noteCard.style.display = 'block';
        
        setTimeout(() => {
            noteCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
        
        showAlert(`📅 ${dateText} seçildi! Not ekleyebilirsin 💕`, 'success');
    }
    
    renderCalendar();
}

function clearSelectedDate() {
    selectedDateValue = null;
    document.getElementById('selectedDate').value = '';
    document.getElementById('selectedDateDisplay').style.display = 'none';
    renderCalendar();
}

// Close note form
function closeNoteForm() {
    const noteCard = document.getElementById('addNoteCard');
    noteCard.style.display = 'none';
    
    // Clear form
    document.getElementById('noteForm').reset();
    clearSelectedDate();
    removeImage();
    
    // Hide emoji picker if open
    const emojiPicker = document.getElementById('emojiPicker');
    if (emojiPicker) {
        emojiPicker.style.display = 'none';
    }
    
    showAlert('Form kapatıldı! Takvimden bir gün seçerek tekrar açabilirsin 💕', 'info');
}

// Show day notes in modal
function showDayNotes(dateValue, dateText, dayNotes) {
    document.getElementById('dayNotesTitle').textContent = `${dateText} - ${dayNotes.length} Not 🍪`;
    
    const categoryEmojis = {
        'kişisel': '💕',
        'önemli': '⭐',
        'hatırlatma': '🔔',
        'alışveriş': '🛍️',
        'diğer': '🍪'
    };
    
    const container = document.getElementById('dayNotesContainer');
    container.innerHTML = dayNotes.map(note => `
        <div class="note-item priority-${note.priority} ${note.pinned ? 'pinned' : ''}" data-id="${note.id}">
            ${note.pinned ? '<div class="note-pin-badge">📌</div>' : ''}
            <div class="note-header">
                <h4 class="note-title">${escapeHtml(note.title)}</h4>
                <span class="note-category">${categoryEmojis[note.category] || '🍪'}</span>
            </div>
            ${note.image ? `<img src="${note.image}" alt="Note image" class="note-image">` : ''}
            <p class="note-content">${escapeHtml(note.content)}</p>
            ${note.tags.length > 0 ? `
                <div class="note-tags">
                    ${note.tags.map(tag => `<span class="note-tag">🏷️ ${escapeHtml(tag)}</span>`).join('')}
                </div>
            ` : ''}
            <div class="note-date">
                ${note.time ? `<span class="note-time">⏰ ${note.time}</span>` : ''}
                <i class="fas fa-clock"></i> ${note.date}
            </div>
            <div class="note-actions">
                <button class="btn-action btn-pin" onclick="togglePin(${note.id}); updateDayNotesModal()">
                    <i class="fas fa-thumbtack"></i> ${note.pinned ? 'Çıkar' : 'Sabitle'}
                </button>
                <button class="btn-action btn-edit" onclick="editNoteFromModal(${note.id})">
                    <i class="fas fa-edit"></i> Düzenle
                </button>
                <button class="btn-action btn-delete" onclick="deleteNote(${note.id}); updateDayNotesModal()">
                    <i class="fas fa-trash"></i> Sil
                </button>
            </div>
        </div>
    `).join('');
    
    const modal = new bootstrap.Modal(document.getElementById('dayNotesModal'));
    modal.show();
}

// Add note for the currently selected day from modal
function addNoteForThisDay() {
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('dayNotesModal'));
    if (modal) {
        modal.hide();
    }
    
    // Show add form
    const dateValue = selectedDateValue;
    const dateDisplay = document.getElementById('selectedDateText').textContent;
    
    document.getElementById('selectedDate').value = dateValue;
    document.getElementById('selectedDateText').textContent = dateDisplay;
    document.getElementById('selectedDateDisplay').style.display = 'block';
    
    const noteCard = document.getElementById('addNoteCard');
    noteCard.style.display = 'block';
    
    setTimeout(() => {
        noteCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
}

// Edit note from modal
function editNoteFromModal(id) {
    // Close day notes modal
    const dayModal = bootstrap.Modal.getInstance(document.getElementById('dayNotesModal'));
    if (dayModal) {
        dayModal.hide();
    }
    
    // Open edit modal
    setTimeout(() => {
        editNote(id);
    }, 300);
}

// Update day notes modal after changes
function updateDayNotesModal() {
    const dateValue = selectedDateValue;
    if (!dateValue) return;
    
    const notesForDay = notes.filter(note => note.dateValue === dateValue);
    
    if (notesForDay.length === 0) {
        // No more notes, close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('dayNotesModal'));
        if (modal) {
            modal.hide();
        }
        renderCalendar();
        return;
    }
    
    // Update modal content
    const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
                        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    const date = new Date(dateValue);
    const dateText = `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    
    showDayNotes(dateValue, dateText, notesForDay);
    renderCalendar();
}

// Dark Mode
function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
    
    const icon = document.querySelector('.btn-dark-mode i');
    icon.className = isDarkMode ? 'fas fa-sun' : 'fas fa-moon';
    
    showAlert(isDarkMode ? 'Karanlık mod açıldı! 🌙' : 'Aydınlık mod açıldı! ☀️', 'success');
}

// Statistics
function toggleStats() {
    const statsCard = document.getElementById('statsCard');
    const isVisible = statsCard.style.display !== 'none';
    
    if (isVisible) {
        statsCard.style.display = 'none';
    } else {
        statsCard.style.display = 'block';
        updateStatistics();
    }
}

function updateStatistics() {
    const totalNotes = notes.length;
    const pinnedNotes = notes.filter(n => n.pinned).length;
    
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisWeekNotes = notes.filter(note => {
        const noteDate = new Date(note.dateValue);
        return noteDate >= weekAgo && noteDate <= today;
    }).length;
    
    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();
    const thisMonthNotes = notes.filter(note => {
        const noteDate = new Date(note.dateValue);
        return noteDate.getMonth() === thisMonth && noteDate.getFullYear() === thisYear;
    }).length;
    
    document.getElementById('totalNotes').textContent = totalNotes;
    document.getElementById('thisWeekNotes').textContent = thisWeekNotes;
    document.getElementById('pinnedNotes').textContent = pinnedNotes;
    document.getElementById('thisMonthNotes').textContent = thisMonthNotes;
    
    // Category stats
    const categories = {};
    notes.forEach(note => {
        categories[note.category] = (categories[note.category] || 0) + 1;
    });
    
    const categoryEmojis = {
        'kişisel': '💕',
        'önemli': '⭐',
        'hatırlatma': '🔔',
        'alışveriş': '🛍️',
        'diğer': '🍪'
    };
    
    const categoryStatsHTML = Object.entries(categories)
        .map(([cat, count]) => `
            <span class="category-stat-badge">
                ${categoryEmojis[cat]} ${cat}: ${count}
            </span>
        `).join('');
    
    document.getElementById('categoryStats').innerHTML = categoryStatsHTML || '<p style="text-align: center; color: #e83e8c;">Henüz kategori istatistiği yok</p>';
}

// Export/Import
function exportNotes() {
    const dataStr = JSON.stringify(notes, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kurabiye-notlar-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    showAlert('Notlar dışa aktarıldı! 💾', 'success');
}

function importNotes(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedNotes = JSON.parse(e.target.result);
            if (confirm(`${importedNotes.length} not içe aktarılacak. Mevcut notlar silinecek. Onaylıyor musunuz?`)) {
                notes = importedNotes;
                saveNotes();
                renderNotes();
                renderCalendar();
                updateStatistics();
                showAlert('Notlar başarıyla içe aktarıldı! 💕', 'success');
            }
        } catch (error) {
            showAlert('Dosya okunamadı! Lütfen geçerli bir JSON dosyası seçin. ❌', 'error');
        }
    };
    reader.readAsText(file);
    
    // Reset input
    event.target.value = '';
}

// Image handling
function previewImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('previewImg').src = e.target.result;
            document.getElementById('imagePreview').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

function removeImage() {
    document.getElementById('noteImage').value = '';
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('previewImg').src = '';
}

// Emoji Picker
function toggleEmojiPicker() {
    const picker = document.getElementById('emojiPicker');
    currentEmojiTarget = document.getElementById('noteContent');
    
    if (picker.style.display === 'none' || !picker.style.display) {
        picker.style.display = 'grid';
        if (picker.innerHTML === '') {
            picker.innerHTML = emojis.map(emoji => 
                `<span onclick="insertEmoji('${emoji}')">${emoji}</span>`
            ).join('');
        }
    } else {
        picker.style.display = 'none';
    }
}

function insertEmoji(emoji) {
    if (currentEmojiTarget) {
        const start = currentEmojiTarget.selectionStart;
        const end = currentEmojiTarget.selectionEnd;
        const text = currentEmojiTarget.value;
        currentEmojiTarget.value = text.substring(0, start) + emoji + text.substring(end);
        currentEmojiTarget.focus();
        currentEmojiTarget.selectionStart = currentEmojiTarget.selectionEnd = start + emoji.length;
    }
}

// Notifications
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function checkReminders() {
    if ('Notification' in window && Notification.permission === 'granted') {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const today = now.toISOString().split('T')[0];
        
        notes.forEach(note => {
            if (note.time && note.dateValue === today && note.time === currentTime) {
                new Notification('🍪 Kurabiye Hatırlatma!', {
                    body: `${note.title}\n${note.content}`,
                    icon: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=100&h=100&fit=crop'
                });
            }
        });
    }
}
