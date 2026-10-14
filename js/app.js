// Okey Ana Oyun Yöneticisi (App Controller & Game Loop)

class OkeyApp {
    constructor() {
        this.engine = new OkeyEngine();
        this.ui = new OkeyUI();
        this.sound = window.soundEngine;
        this.isAiRunning = false;

        this.initEvents();
        this.startNewRound();
    }

    // Yeni el başlat
    startNewRound() {
        this.sound.playShuffle();
        this.isAiRunning = false;
        // Oyuna insan başlasın (15 taş ile)
        this.engine.startRound(0);

        // İnsanın taşlarını ıstakaya senkronize et
        this.ui.syncHandToIstaka(this.engine.players[0].tiles);
        this.ui.clearSelection();
        this.ui.renderTable(this.engine);

        this.ui.setStatus('Oyuna 15 taş ile siz başladınız. Fazla olan bir taşınızı atın.');
    }

    // Olay dinleyicilerini başlat
    initEvents() {
        // 1. Ortadan Taş Çekme
        const drawDeck = document.getElementById('drawDeck');
        drawDeck.addEventListener('click', () => {
            if (this.engine.turn === 0 && this.engine.turnPhase === 'draw' && !this.isAiRunning) {
                const tile = this.engine.drawFromDeck(0);
                if (tile) {
                    this.sound.playTileDraw();
                    this.placeTileInFirstEmptySlot(tile);
                    this.ui.renderTable(this.engine);
                    this.ui.setStatus('Taş çektiniz. Istakanızdan atılacak bir taş seçin.');
                }
            }
        });

        // 2. Solundaki Oyuncunun (Batı) Attığı Taşı Çekme
        const discardWest = document.getElementById('discard-3');
        discardWest.addEventListener('click', () => {
            if (this.engine.turn === 0 && this.engine.turnPhase === 'draw' && !this.isAiRunning) {
                const tile = this.engine.drawFromDiscard(0);
                if (tile) {
                    this.sound.playTileDraw();
                    this.placeTileInFirstEmptySlot(tile);
                    this.ui.renderTable(this.engine);
                    this.ui.setStatus('Yerden taş aldınız. Istakanızdan atılacak bir taş seçin.');
                }
            }
        });

        // 3. Istaka Yuvalarına Tıklama (Seçim / Taşı Taşıma / Yer Değiştirme)
        for (let i = 0; i < 28; i++) {
            const slotEl = document.querySelector(`.istaka-slot[data-slot-idx="${i}"]`);
            if (slotEl) {
                slotEl.addEventListener('click', () => this.handleSlotClick(i));
                slotEl.addEventListener('dblclick', () => this.handleSlotDoubleClick(i));
            }
        }

        // 4. Kendi Atık Alanına Tıklama (Seçili taşı atma)
        const discardSouth = document.getElementById('discard-0');
        discardSouth.addEventListener('click', () => {
            if (this.engine.turn === 0 && this.engine.turnPhase === 'discard' && this.ui.selectedSlotIndex !== null) {
                this.discardSelectedTile();
            }
        });

        // 5. Sıralama Yardımcı Düğmeleri
        document.getElementById('btnSortRuns').addEventListener('click', () => {
            const currentTiles = this.ui.getCurrentHandFromSlots();
            const sorted = this.engine.sortHandByRuns(currentTiles);
            this.sound.playTileMove();
            this.ui.syncHandToIstaka(sorted);
        });

        document.getElementById('btnSortSets').addEventListener('click', () => {
            const currentTiles = this.ui.getCurrentHandFromSlots();
            const sorted = this.engine.sortHandBySets(currentTiles);
            this.sound.playTileMove();
            this.ui.syncHandToIstaka(sorted);
        });

        document.getElementById('btnSortPairs').addEventListener('click', () => {
            const currentTiles = this.ui.getCurrentHandFromSlots();
            const sorted = this.engine.sortHandByPairs(currentTiles);
            this.sound.playTileMove();
            this.ui.syncHandToIstaka(sorted);
        });

        // 6. Eli Bitirme Düğmesi
        document.getElementById('btnFinish').addEventListener('click', () => {
            this.handlePlayerFinish();
        });

        // 7. Yeni Oyun Düğmesi
        document.getElementById('btnNewGame').addEventListener('click', () => {
            this.startNewRound();
        });

        // 8. Ses Düğmesi
        const btnSound = document.getElementById('btnSound');
        const soundIcon = document.getElementById('soundIcon');
        btnSound.addEventListener('click', () => {
            const enabled = this.sound.toggle();
            soundIcon.textContent = enabled ? '🔊' : '🔇';
        });

        // 9. Kurallar Modalı
        const btnRules = document.getElementById('btnRules');
        const modalRules = document.getElementById('modalRules');
        btnRules.addEventListener('click', () => {
            modalRules.classList.add('active');
        });

        document.querySelectorAll('[data-close-modal]').forEach(b => {
            b.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal-overlay');
                if (modal) modal.classList.remove('active');
            });
        });

        document.getElementById('btnNextRound').addEventListener('click', () => {
            document.getElementById('modalWin').classList.remove('active');
            this.startNewRound();
        });
    }

    // İlk boş yuvaya taşı koy
    placeTileInFirstEmptySlot(tile) {
        for (let i = 0; i < 28; i++) {
            if (this.ui.istakaSlots[i] === null) {
                this.ui.istakaSlots[i] = tile;
                break;
            }
        }
        this.ui.renderIstaka();
    }

    // Yuva tıklaması (Seçim veya taşıma)
    handleSlotClick(slotIndex) {
        const clickedTile = this.ui.istakaSlots[slotIndex];

        // 1. Zaten seçili bir taş varsa:
        if (this.ui.selectedSlotIndex !== null) {
            // Aynı taşa tıklandıysa seçimi kaldır
            if (this.ui.selectedSlotIndex === slotIndex) {
                this.ui.clearSelection();
                this.sound.playClick();
                this.ui.renderIstaka();
                return;
            }

            // Başka bir yuvaya tıklandıysa: Yer değiştir (Swap / Move)
            const originIndex = this.ui.selectedSlotIndex;
            const originTile = this.ui.istakaSlots[originIndex];

            this.ui.istakaSlots[originIndex] = clickedTile;
            this.ui.istakaSlots[slotIndex] = originTile;

            this.sound.playTileMove();
            this.ui.clearSelection();
            this.ui.renderIstaka();
            return;
        }

        // 2. Henüz seçili taş yoksa ve tıklanan yuvada taş varsa seç
        if (clickedTile !== null) {
            this.ui.selectedSlotIndex = slotIndex;
            this.sound.playClick();
            this.ui.renderIstaka();

            if (this.engine.turn === 0 && this.engine.turnPhase === 'discard') {
                this.ui.setStatus('Taş seçildi. Atmak için çift tıklayın veya atık kutunuza dokunun.');
            }
        }
    }

    // Çift tıklama ile hızlı taş atma
    handleSlotDoubleClick(slotIndex) {
        if (this.engine.turn === 0 && this.engine.turnPhase === 'discard' && !this.isAiRunning) {
            this.ui.selectedSlotIndex = slotIndex;
            this.discardSelectedTile();
        }
    }

    // Seçili taşı at
    discardSelectedTile() {
        if (this.ui.selectedSlotIndex === null) return;

        const tileToDiscard = this.ui.istakaSlots[this.ui.selectedSlotIndex];
        if (!tileToDiscard) return;

        // Taşı motorda at
        const res = this.engine.discardTile(0, tileToDiscard.id);
        if (res) {
            this.sound.playTileDiscard();
            this.ui.istakaSlots[this.ui.selectedSlotIndex] = null;
            this.ui.clearSelection();
            this.ui.renderIstaka();
            this.ui.renderTable(this.engine);

            // Sıra Doğu'ya geçti, AI turunu başlat
            this.executeAiTurns();
        }
    }

    // Oyuncunun eli bitirme denemesi
    handlePlayerFinish() {
        if (this.engine.turn !== 0 || this.engine.turnPhase !== 'discard') {
            this.ui.setStatus('Eli bitirmek için önce taş çekmelisiniz!');
            return;
        }

        const hand = this.ui.getCurrentHandFromSlots();
        if (hand.length !== 15) {
            this.ui.setStatus('Eli bitirmek için 15 taşınız olmalı (14 per + 1 atılacak taş)!');
            return;
        }

        // 15 taştan biri atılacak, kalan 14 taş per oluşturuyor mu dene
        let winFound = false;
        let discardCandidate = null;

        // Önce seçili taş varsa onu dene
        const testOrder = [];
        if (this.ui.selectedSlotIndex !== null && this.ui.istakaSlots[this.ui.selectedSlotIndex]) {
            testOrder.push(this.ui.istakaSlots[this.ui.selectedSlotIndex]);
        }
        for (const t of hand) {
            if (!testOrder.includes(t)) testOrder.push(t);
        }

        for (const candidate of testOrder) {
            const remaining14 = hand.filter(t => t.id !== candidate.id);
            const check = this.engine.checkWinningHand(remaining14);
            if (check.canWin) {
                winFound = true;
                discardCandidate = candidate;
                break;
            }
        }

        if (winFound) {
            // Kazandı!
            this.sound.playWin();
            // 15. taşı atık alanına koy
            this.engine.discardTile(0, discardCandidate.id);
            this.ui.renderTable(this.engine);

            document.getElementById('winPlayerName').textContent = 'Tebrikler, Kazandınız! 🎉';
            document.getElementById('winDescription').textContent = '14 taşınızla kusursuz per oluşturdunuz ve eli bitirdiniz.';
            document.getElementById('modalWin').classList.add('active');
        } else {
            this.sound.playClick();
            this.ui.setStatus('Istakanızdaki taşlar henüz geçerli bir per oluşturmuyor!');
        }
    }

    // Botların (Doğu, Kuzey, Batı) Turlarını Çalıştır
    async executeAiTurns() {
        this.isAiRunning = true;

        while (this.engine.turn !== 0 && !this.engine.gameOver) {
            const currentAi = this.engine.turn;
            const aiName = this.engine.players[currentAi].name;

            this.ui.setStatus(`${aiName} düşünüyor...`);
            this.ui.renderTable(this.engine);
            await this.sleep(800);

            // 1. Taş Çekme Kararı
            const drawChoice = this.engine.decideAiDraw(currentAi);
            if (drawChoice === 'discard') {
                this.engine.drawFromDiscard(currentAi);
            } else {
                this.engine.drawFromDeck(currentAi);
            }
            this.sound.playTileDraw();
            this.ui.renderTable(this.engine);

            await this.sleep(700);

            // 2. Eli Bitirme Kontrolü (AI kazanabilir mi?)
            const aiHand = this.engine.players[currentAi].tiles;
            let aiCanWin = false;
            let finishDiscard = null;

            for (const candidate of aiHand) {
                const rem14 = aiHand.filter(t => t.id !== candidate.id);
                if (this.engine.checkWinningHand(rem14).canWin) {
                    aiCanWin = true;
                    finishDiscard = candidate;
                    break;
                }
            }

            if (aiCanWin) {
                this.sound.playWin();
                this.engine.discardTile(currentAi, finishDiscard.id);
                this.ui.renderTable(this.engine);

                document.getElementById('winPlayerName').textContent = `${aiName} Kazandı! 🤖`;
                document.getElementById('winDescription').textContent = `${aiName} eli geçerli perlerle açarak tamamladı.`;
                document.getElementById('modalWin').classList.add('active');
                this.isAiRunning = false;
                return;
            }

            // 3. Normal Taş Atma Kararı
            const discardTileId = this.engine.decideAiDiscard(currentAi);
            this.engine.discardTile(currentAi, discardTileId);
            this.sound.playTileDiscard();
            this.ui.renderTable(this.engine);

            await this.sleep(600);
        }

        this.isAiRunning = false;
        this.ui.renderTable(this.engine);
        this.ui.setStatus('Sıra sizde! Ortadaki desteden veya solunuzdaki Batı\'nın attığı taştan çekin.');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Başlat
window.addEventListener('DOMContentLoaded', () => {
    window.okeyApp = new OkeyApp();
});
