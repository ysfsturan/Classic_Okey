// Okey Kullanıcı Arayüzü (UI Renderer, Istaka Yönetimi ve 101 Masası)

class OkeyUI {
    constructor() {
        // 28 yuvalı ıstaka (0-13 üst sıra, 14-27 alt sıra)
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

    // Yuvaları doğrudan belirlenmiş 28 slotluk diziyle güncelle
    setSlots(slots) {
        this.istakaSlots = [...slots];
        this.renderIstaka();
    }

    // Oyuncunun taşlarını ıstakaya senkronize et
    syncHandToIstaka(tiles, engine = null) {
        if (engine) {
            // Otomatik olarak boşluklu seri dizilimiyle başlat
            const slots = engine.arrangeByRuns(tiles);
            this.setSlots(slots);
        } else {
            this.istakaSlots.fill(null);
            for (let i = 0; i < tiles.length && i < 28; i++) {
                this.istakaSlots[i] = tiles[i];
            }
            this.renderIstaka();
        }
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

    // Masadaki ortak alanları (Deste, Gösterge, Atıklar, Açılan Perler) çiz
    renderTable(engine) {
        // 1. Deste Sayısı
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

        // 3. Atık Taşlar
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

            // Solumuzdaki oyuncudan (Batı: 3) taş çekebilir miyiz?
            if (p === 3 && engine.turn === 0 && engine.turnPhase === 'draw' && pile.length > 0) {
                box.classList.add('can-draw');
            }
        }

        // 4. Oyuncu Rozetleri ve 101 Durumları
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
                if (engine.gameMode === '101') {
                    const statusText = engine.players[p].hasOpened ? ' (Açtı ✅)' : ' (Açmadı)';
                    scoreEl.textContent = `Ceza: ${engine.scores[p]}${statusText}`;
                } else {
                    scoreEl.textContent = `Kalan: ${engine.scores[p]}`;
                }
            }
        }

        // 5. 101 Masaya Açılan Perler Bölgesi
        const openedArea = document.getElementById('openedMeldsContainer');
        if (openedArea) {
            if (engine.gameMode === '101') {
                openedArea.style.display = 'flex';
                openedArea.innerHTML = '';

                if (engine.tableOpenedMelds.length === 0) {
                    openedArea.innerHTML = '<span class="empty-melds-label">Masaya henüz el açılmadı. (En az 101 puan veya 5 çift gerekir)</span>';
                } else {
                    for (const entry of engine.tableOpenedMelds) {
                        for (const meld of entry.melds) {
                            const meldGroupEl = document.createElement('div');
                            meldGroupEl.className = 'table-meld-group';
                            meldGroupEl.setAttribute('data-owner', entry.playerName);

                            for (const t of meld.tiles) {
                                const miniTile = this.createTileElement(t);
                                miniTile.classList.add('table-opened-tile');
                                meldGroupEl.appendChild(miniTile);
                            }
                            openedArea.appendChild(meldGroupEl);
                        }
                    }
                }
            } else {
                openedArea.style.display = 'none';
            }
        }

        // 6. 101 Puan Takipçisi ve El Açma Düğmesi
        this.update101Tracker(engine);
    }

    // 101 Canlı Puan Göstergesi
    update101Tracker(engine) {
        const tracker = document.getElementById('tracker101');
        const btnOpen = document.getElementById('btnOpen101');

        if (!tracker || !btnOpen) return;

        if (engine.gameMode === '101') {
            tracker.style.display = 'inline-flex';
            btnOpen.style.display = 'inline-flex';

            const hand = this.getCurrentHandFromSlots();
            const evalRes = engine.evaluate101Hand(hand);

            if (engine.players[0].hasOpened) {
                tracker.innerHTML = `✅ Elinizi Açtınız (${engine.players[0].openedType === 'runs' ? 'Seri' : 'Çift'})`;
                tracker.className = 'tracker-101 opened';
                btnOpen.disabled = true;
                btnOpen.textContent = 'El Açıldı';
            } else {
                if (evalRes.canOpenRuns) {
                    tracker.innerHTML = `Per Toplamı: <strong>${evalRes.totalScore}</strong> / 101 ✅ (Açabilirsiniz!)`;
                    tracker.className = 'tracker-101 ready';
                    btnOpen.disabled = false;
                } else if (evalRes.canOpenPairs) {
                    tracker.innerHTML = `Çift Sayısı: <strong>${evalRes.pairCount}</strong> / 5 Çift ✅ (Çiftten Açabilirsiniz!)`;
                    tracker.className = 'tracker-101 ready';
                    btnOpen.disabled = false;
                } else {
                    tracker.innerHTML = `Per Toplamı: <strong>${evalRes.totalScore}</strong> / 101 (Çift: ${evalRes.pairCount}/5)`;
                    tracker.className = 'tracker-101';
                    btnOpen.disabled = true;
                }
            }
        } else {
            tracker.style.display = 'none';
            btnOpen.style.display = 'none';
        }
    }

    // Durum bildirimini güncelle
    setStatus(text) {
        document.getElementById('statusMessage').textContent = text;
    }

    // Seçimi temizle
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
