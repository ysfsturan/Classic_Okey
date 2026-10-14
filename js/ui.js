// Okey Kullanıcı Arayüzü (UI Renderer & Istaka Yönetimi)

class OkeyUI {
    constructor() {
        // Istaka slotları (Toplam 28 yuva: 0-13 üst, 14-27 alt)
        // Her yuva: OkeyTile veya null
        this.istakaSlots = Array(28).fill(null);
        this.selectedSlotIndex = null;
        this.initIstakaSlots();
    }

    // Istaka yuvalarını DOM üzerinde oluştur
    initIstakaSlots() {
        const topRow = document.getElementById('istakaRowTop');
        const bottomRow = document.getElementById('istakaRowBottom');

        topRow.innerHTML = '';
        bottomRow.innerHTML = '';

        for (let i = 0; i < 14; i++) {
            const slot = document.createElement('div');
            slot.className = 'istaka-slot';
            slot.setAttribute('data-slot-idx', i);
            topRow.appendChild(slot);
        }

        for (let i = 14; i < 28; i++) {
            const slot = document.createElement('div');
            slot.className = 'istaka-slot';
            slot.setAttribute('data-slot-idx', i);
            bottomRow.appendChild(slot);
        }
    }

    // Oyuncunun taşlarını ıstaka yuvalarına yerleştir
    syncHandToIstaka(tiles) {
        // Mevcut yuvaları temizle
        this.istakaSlots.fill(null);

        // İlk 14 taşı üst sıraya, kalanları alt sıraya yerleştir
        for (let i = 0; i < tiles.length; i++) {
            if (i < 28) {
                this.istakaSlots[i] = tiles[i];
            }
        }
        this.renderIstaka();
    }

    // Tek bir Okey taşı DOM öğesi oluştur
    createTileElement(tile) {
        const el = document.createElement('div');
        el.className = `okey-tile tile-${tile.color}`;
        el.setAttribute('data-tile-id', tile.id);

        if (tile.isFake) {
            el.classList.add('tile-fake');
            el.innerHTML = `
                <div class="tile-fake-crest">⭐</div>
                <div class="tile-number">${tile.value}</div>
                <div class="tile-dot"></div>
            `;
        } else {
            el.innerHTML = `
                <div class="tile-number">${tile.value}</div>
                <div class="tile-dot"></div>
            `;
        }

        // Gerçek Okey Rozeti
        if (tile.isOkey) {
            const badge = document.createElement('div');
            badge.className = 'okey-badge';
            badge.innerHTML = '👑';
            badge.title = 'OKEY';
            el.appendChild(badge);
        }

        return el;
    }

    // Istakayı ekrana çiz
    renderIstaka() {
        for (let i = 0; i < 28; i++) {
            const slotEl = document.querySelector(`.istaka-slot[data-slot-idx="${i}"]`);
            if (!slotEl) continue;

            slotEl.innerHTML = '';
            const tile = this.istakaSlots[i];

            if (tile) {
                const tileEl = this.createTileElement(tile);
                if (this.selectedSlotIndex === i) {
                    tileEl.classList.add('selected');
                }
                slotEl.appendChild(tileEl);
            }
        }
    }

    // Masadaki ortak alanları (Deste, Gösterge, Atıklar) çiz
    renderTable(engine) {
        // 1. Deste Kalan Sayısı
        document.getElementById('deckCount').textContent = `${engine.deck.length} Taş`;
        const drawDeck = document.getElementById('drawDeck');
        if (engine.turn === 0 && engine.turnPhase === 'draw') {
            drawDeck.classList.remove('disabled');
        } else {
            drawDeck.classList.add('disabled');
        }

        // 2. Gösterge Taşı
        const indicatorSlot = document.getElementById('indicatorSlot');
        indicatorSlot.innerHTML = '';
        if (engine.indicator) {
            const indEl = this.createTileElement(engine.indicator);
            indicatorSlot.appendChild(indEl);
        }

        // 3. Atık Taşlar (Discards)
        for (let p = 0; p < 4; p++) {
            const box = document.getElementById(`discard-${p}`);
            if (!box) continue;

            box.innerHTML = '';
            box.classList.remove('can-draw');

            const pile = engine.discards[p];
            if (pile.length > 0) {
                const topTile = pile[pile.length - 1];
                const tileEl = this.createTileElement(topTile);
                box.appendChild(tileEl);
            }

            // Solumuzdaki oyuncunun (Batı: 3) attığı taştan çekebilir miyiz?
            if (p === 3 && engine.turn === 0 && engine.turnPhase === 'draw' && pile.length > 0) {
                box.classList.add('can-draw');
            }
        }

        // 4. Oyuncu Kartları ve Sıra Vurgusu
        for (let p = 1; p <= 3; p++) {
            const badge = document.getElementById(`badge-${p}`);
            if (!badge) continue;

            if (engine.turn === p) {
                badge.classList.add('active-turn');
            } else {
                badge.classList.remove('active-turn');
            }

            const scoreEl = document.getElementById(`score-${p}`);
            if (scoreEl) {
                scoreEl.textContent = `Kalan: ${engine.scores[p]}`;
            }
        }
    }

    // Durum bildirimini güncelle
    setStatus(text) {
        document.getElementById('statusMessage').textContent = text;
    }

    // Seçili taşı temizle
    clearSelection() {
        this.selectedSlotIndex = null;
        document.querySelectorAll('.okey-tile.selected').forEach(el => el.classList.remove('selected'));
    }

    // Istakadaki taşların listesini al
    getCurrentHandFromSlots() {
        return this.istakaSlots.filter(t => t !== null);
    }
}

window.OkeyUI = OkeyUI;
