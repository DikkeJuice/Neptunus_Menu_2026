document.addEventListener('DOMContentLoaded', () => {
    loadMenuData();
});

async function loadMenuData() {
    try {
        const response = await fetch('./assets/neptunus2026.csv');
        const csvText = await response.text();
        
        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                const items = results.data.filter(item => 
                    item.Visible === 'TRUE' && parseFloat(item.Price) > 0
                );
                renderMenu(items);
            }
        });
    } catch (error) {
        console.error("Failed to load menu data:", error);
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

function renderMenu(items) {
    const container = document.getElementById('menu-container');
    container.innerHTML = ''; // clear

    // Categories we want to extract
    const wings = [];
    const tostis = [];
    const snacks = [];
    const broodjes = [];

    items.forEach(item => {
        const cat = item.Categories ? item.Categories.toUpperCase() : '';
        const name = item['Display name'] || item.Name;
        
        const mappedItem = {
            name: name,
            desc: item.Description || '',
            price: processPrice(item.Price),
            rawPrice: parseFloat(item.Price) || 0
        };

        if (cat.includes('WINGS')) {
            wings.push(mappedItem);
        } else if (cat.includes('TOSTI')) {
            tostis.push(mappedItem);
        } else if (cat.includes('BROODJES')) {
            broodjes.push(mappedItem);
        } else if (cat.includes('SNACK') || cat.includes('FRIET')) {
            snacks.push(mappedItem);
        }
    });

    // Zorg ervoor dat Tosti Kaas en Tosti Ham Kaas bovenaan staan, rest op prijs
    tostis.sort((a, b) => {
        if (a.name.toLowerCase() === 'tosti kaas') return -1;
        if (b.name.toLowerCase() === 'tosti kaas') return 1;
        if (a.name.toLowerCase() === 'tosti ham kaas') return -1;
        if (b.name.toLowerCase() === 'tosti ham kaas') return 1;
        return a.rawPrice - b.rawPrice;
    });

    // Wings oplopend op prijs
    wings.sort((a, b) => a.rawPrice - b.rawPrice);

    // Snacks groeperen op base snack naam
    function getSnackGroup(snackName) {
        const lower = snackName.toLowerCase();
        if (lower.includes('friet')) return 1;
        if (lower.includes('kroket')) return 2;
        if (lower.includes('frikandel')) return 3;
        if (lower.includes('kaassouffl')) return 4;
        if (lower.includes('mexicano')) return 5;
        if (lower.includes('bitterbal')) return 6;
        if (lower.includes('kaasstengel')) return 7;
        if (lower.includes('bittergarni')) return 8;
        return 99;
    }

    snacks.sort((a, b) => {
        const groupA = getSnackGroup(a.name);
        const groupB = getSnackGroup(b.name);
        if (groupA !== groupB) return groupA - groupB;
        return a.rawPrice - b.rawPrice;
    });

    broodjes.sort((a, b) => {
        const groupA = getSnackGroup(a.name);
        const groupB = getSnackGroup(b.name);
        if (groupA !== groupB) return groupA - groupB;
        return a.rawPrice - b.rawPrice;
    });

    // 1. Render Wings Feature (Full Width Top)
    const wingsSection = document.createElement('section');
    wingsSection.className = 'glass-panel wings-feature menu-section';
    wingsSection.innerHTML = `
        <h3 class="section-title">FAMOUS NEPTUNUS WINGS</h3>
        <div class="wings-flavors">
            AVAILABLE FLAVOURS:<br>
            <span class="flavor-badge">PLAIN</span>
            <span class="flavor-badge">TERIYAKI</span>
            <span class="flavor-badge">LEMON PEPPER</span>
            <span class="flavor-badge">SPICY KOREAN</span>
        </div>
        <div class="wings-grid">
            ${wings.map(w => `
                <div class="menu-item">
                    <div class="item-info">
                        <h4 class="item-name">${w.name}</h4>
                    </div>
                    <div class="item-price">${w.price}</div>
                </div>
            `).join('')}
        </div>
    `;
    container.appendChild(wingsSection);

    // 2. Render Tosti's
    container.appendChild(createSection("TOSTI'S", tostis));

    // 3. Render Broodjes
    container.appendChild(createSection('BROODJES', broodjes));

    // 4. Render Snacks & Friet
    // We can merge them or just put them in the remaining grid slot
    container.appendChild(createSection('SNACKS & BITES', snacks));
}

function createSection(title, itemsList) {
    const section = document.createElement('section');
    section.className = 'glass-panel menu-section';
    
    let itemsHtml = itemsList.map(item => `
        <div class="menu-item">
            <div class="item-info">
                <h4 class="item-name">${item.name}</h4>
            </div>
            <div class="item-price">${item.price}</div>
        </div>
    `).join('');

    section.innerHTML = `
        <h3 class="section-title">${title}</h3>
        ${itemsHtml}
    `;
    return section;
}
