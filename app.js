document.addEventListener('DOMContentLoaded', () => {
    loadMenuData();
});

async function loadMenuData() {
    try {
        let csvPath = window.MENU_CSV || null;
        let menuTitle = null;
        let menuSubtitle = null;
        let menuTagline = null;

        if (!csvPath) {
            try {
                const scheduleResp = await fetch('./assets/menu_schedule.json');
                const schedule = await scheduleResp.json();
                const now = new Date();
                const today = now.toISOString().split('T')[0];
                const event = schedule.events.find(e => {
                    if (e.startDate.length > 10) {
                        const start = new Date(e.startDate);
                        const end = e.endDate ? new Date(e.endDate) : start;
                        return now >= start && now <= end;
                    }
                    return today >= e.startDate && today <= (e.endDate || e.startDate);
                });

                if (event) {
                    csvPath = event.csv || schedule.defaultCsv;
                    menuTitle = event.title;
                    menuSubtitle = event.subtitle;
                    menuTagline = event.tagline;
                } else {
                    csvPath = schedule.defaultCsv;
                }
            } catch (e) {
                csvPath = './assets/neptunus2026.csv';
            }
        }

        if (!csvPath) {
            csvPath = './assets/neptunus2026.csv';
        }

        updateHeader(menuTitle, menuSubtitle, menuTagline);

        const response = await fetch(csvPath);
        const csvText = await response.text();
        
        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                const items = results.data.filter(item => {
                    if (item.Visible !== 'TRUE') return false;
                    const isSaus = item.Categories && item.Categories.toUpperCase().includes('SAUS');
                    return parseFloat(item.Price) > 0 || isSaus;
                });
                renderMenu(items);
            }
        });
    } catch (error) {
        console.error("Failed to load menu data:", error);
    }
}

function updateHeader(title, subtitle, tagline) {
    if (title) {
        const h1 = document.querySelector('.menu-header .glow-text');
        if (h1) h1.textContent = title;
    }
    if (subtitle) {
        const h2 = document.querySelector('.menu-header h2');
        if (h2) h2.textContent = subtitle;
    }
    let taglineEl = document.querySelector('.menu-header .menu-tagline');
    if (tagline !== undefined && tagline !== null) {
        if (tagline) {
            if (!taglineEl) {
                taglineEl = document.createElement('p');
                taglineEl.className = 'menu-tagline';
                taglineEl.style.cssText = 'text-align:center;color:var(--text-secondary);margin-top:8px;font-size:1.1rem;';
                document.querySelector('.menu-header').appendChild(taglineEl);
            }
            taglineEl.textContent = tagline;
        } else if (taglineEl) {
            taglineEl.remove();
        }
    }
}

function processPrice(priceString) {
    // Menu Psychology: Remove currency symbols
    const price = parseFloat(priceString);
    if(isNaN(price)) return "";
    
    // Format to 2 decimal places, but drop the '.00' if it's a whole number
    // Wait, let's keep it uniform: format 4.5 -> 4.50, format 4.0 -> 4
    if (price % 1 === 0) {
        return price.toString();
    }
    // Replace dot with comma for Dutch styling if needed, but let's stick to simple
    return price.toFixed(2).replace('.', ',');
}

var CATEGORY_CONFIG = {
    'WINGS': { title: 'FAMOUS NEPTUNUS WINGS', order: 1, feature: true },
    'HOTDOGS': { title: 'HOTDOGS', order: 2 },
    'TOSTI': { title: "TOSTI'S", order: 3 },
    'BROODJES': { title: 'BROODJES', order: 4 },
    'FRIET': { title: 'FRIET', order: 5 },
    'LOSSE SNACK': { title: 'SNACKS', order: 6 },
    'SAUS': { title: 'SAUZEN & DIPS', order: 7, special: 'sauces' },
};

function findCategoryKey(categoriesStr) {
    if (!categoriesStr) return null;
    var parts = categoriesStr.split(',').map(function(p) { return p.trim().toUpperCase(); });
    var configKeys = Object.keys(CATEGORY_CONFIG);
    for (var i = 0; i < parts.length; i++) {
        for (var j = 0; j < configKeys.length; j++) {
            if (parts[i] === configKeys[j].toUpperCase()) {
                return configKeys[j];
            }
        }
    }
    return null;
}

function renderMenu(items) {
    var container = document.getElementById('menu-container');
    container.innerHTML = '';

    var categoryGroups = {};
    var extractedSauces = [];

    items.forEach(function(item) {
        var key = findCategoryKey(item.Categories || '');

        if (key === 'SAUS') {
            var modifiers = item.Modifiers || '';
            if (modifiers.indexOf('Saus: (') !== -1) {
                var sauceStr = modifiers.split('Saus: (')[1].split(')')[0];
                var parts = sauceStr.split(',');
                parts.forEach(function(p) {
                    var colonIdx = p.indexOf(': ');
                    if (colonIdx === -1) return;
                    var sName = p.substring(0, colonIdx).trim();
                    var sPriceStr = p.substring(colonIdx + 2).trim();
                    if (sName && sName !== 'Geen saus') {
                        var finalName = sName;
                        if (['Mayo+Curry', 'Mayo+Curry+Uitjes', 'Mayo+Ketchup', 'Mayo+Ketchup+Uitjes'].indexOf(finalName) !== -1) {
                            finalName = 'Speciaal';
                        } else if (['Mayo+Pindasaus', 'Mayo+Pindasaus+Uitjes'].indexOf(finalName) !== -1) {
                            finalName = 'Oorlog';
                        }
                        if (!extractedSauces.some(function(s) { return s.name === finalName; })) {
                            var cleanPrice = sPriceStr.replace('€', '').trim();
                            var rawPrice = parseFloat(cleanPrice);
                            var price = rawPrice > 0 ? processPrice(cleanPrice) : 'Gratis';
                            extractedSauces.push({ name: finalName, price: price, rawPrice: rawPrice });
                        }
                    }
                });
            }
            return;
        }

        if (!key) return;

        if (!categoryGroups[key]) {
            categoryGroups[key] = [];
        }

        categoryGroups[key].push({
            name: item['Display name'] || item.Name,
            desc: item.Description || '',
            price: processPrice(item.Price),
            rawPrice: parseFloat(item.Price) || 0
        });
    });

    if (extractedSauces.length > 0) {
        categoryGroups['SAUS'] = extractedSauces;
    }

    Object.keys(categoryGroups).forEach(function(key) {
        if (key === 'SAUS') return;
        var items = categoryGroups[key];
        if (key === 'TOSTI') {
            items.sort(function(a, b) {
                var nameA = a.name.toLowerCase();
                var nameB = b.name.toLowerCase();
                if (nameA === 'tosti kaas') return -1;
                if (nameB === 'tosti kaas') return 1;
                if (nameA === 'tosti ham kaas') return -1;
                if (nameB === 'tosti ham kaas') return 1;
                return a.rawPrice - b.rawPrice;
            });
        } else {
            items.sort(function(a, b) { return a.rawPrice - b.rawPrice; });
        }
    });

    var sortedKeys = Object.keys(categoryGroups).sort(function(a, b) {
        var orderA = (CATEGORY_CONFIG[a] || {}).order || 99;
        var orderB = (CATEGORY_CONFIG[b] || {}).order || 99;
        return orderA - orderB;
    });

    sortedKeys.forEach(function(key) {
        var config = CATEGORY_CONFIG[key] || { title: key, order: 99 };
        var items = categoryGroups[key];

        if (config.feature) {
            renderWingsSection(container, items, config.title);
        } else {
            renderSection(container, config.title, items);
        }
    });
}

function renderWingsSection(container, items, title) {
    var section = document.createElement('section');
    section.className = 'glass-panel wings-feature menu-section';
    section.innerHTML = '' +
        '<h3 class="section-title">' + title + '</h3>' +
        '<div class="wings-flavors">' +
            'AVAILABLE FLAVOURS:<br>' +
            '<span class="flavor-badge">PLAIN</span>' +
            '<span class="flavor-badge">TERIYAKI</span>' +
            '<span class="flavor-badge">LEMON PEPPER</span>' +
            '<span class="flavor-badge">SPICY KOREAN</span>' +
        '</div>' +
        '<div class="wings-grid">' +
            items.map(function(w) {
                return '<div class="menu-item">' +
                    '<div class="item-info">' +
                        '<h4 class="item-name">' + w.name + '</h4>' +
                    '</div>' +
                    '<div class="item-price">' + w.price + '</div>' +
                '</div>';
            }).join('') +
        '</div>';
    container.appendChild(section);
}

function renderSection(container, title, items) {
    var section = document.createElement('section');
    section.className = 'glass-panel menu-section';

    var itemsHtml = items.map(function(item) {
        return '<div class="menu-item">' +
            '<div class="item-info">' +
                '<h4 class="item-name">' + item.name + '</h4>' +
            '</div>' +
            '<div class="item-price">' + item.price + '</div>' +
        '</div>';
    }).join('');

    section.innerHTML = '<h3 class="section-title">' + title + '</h3>' + itemsHtml;
    container.appendChild(section);
}
