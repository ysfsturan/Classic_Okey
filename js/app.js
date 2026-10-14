// Okey Ana Oyun Yöneticisi (App Controller, Game Loop, 101 & Düz Okey)

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
        this.engine.startRound(0);

        // İnsanın taşlarını ıstakaya akıllı seri dizilimiyle senkronize et
        this.ui.syncHandToIstaka(this.engine.players[0].tiles, this.engine);
        this.ui.clearSelection();
        this.ui.renderTable(this.engine);

        const tileCount = this.engine.gameMode === '101' ? 22 : 15;
        this.ui.setStatus(`Oyuna ${tileCount} taş ile siz başladınız. Fazla olan bir taşınızı atın.`);
    }

    // Olay dinleyicilerini başlat
    initEvents() {
        // 1. Oyun Modu Değiştirici (Klasik vs 101)
        const btnModeClassic = document.getElementById('btnModeClassic');
        const btnMode101 = document.getElementById('btnMode101');

        if (btnModeClassic && btnMode101) {
            btnModeClassic.addEventListener('click', () => {
                if (this.engine.gameMode !== 'classic') {
                    btnModeClassic.classList.add('active');
                    btnMode101.classList.remove('active');
                    this.engine.setGameMode('classic');
                    this.startNewRound();
                }
            });

            btnMode101.addEventListener('click', () => {
                if (this.engine.gameMode !== '101') {
                    btnMode101.classList.add('active');
                    btnModeClassic.classList.remove('active');
                    this.engine.setGameMode('101');
                    this.startNewRound();
                }
            });
        }

        // 2. Ortadan Taş Çekme
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

        // 3. Solundaki Oyuncunun (Batı) Attığı Taşı Çekme
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

        // 4. Istaka Yuvalarına Tıklama (Seçim / Taşıma / Değiştirme)
        for (let i = 0; i < 28; i++) {
            const slotEl = document.querySelector(`.istaka-slot[data-slot-idx="${i}"]`);
            if (slotEl) {
                slotEl.addEventListener('click', () => this.handleSlotClick(i));
                slotEl.addEventListener('dblclick', () => this.handleSlotDoubleClick(i));
            }
        }

        // 5. Kendi Atık Alanına Tıklama (Seçili taşı atma)
        const discardSouth = document.getElementById('discard-0');
        discardSouth.addEventListener('click', () => {
            if (this.engine.turn === 0 && this.engine.turnPhase === 'discard' && this.ui.selectedSlotIndex !== null) {
                this.discardSelectedTile();
            }
        });

        // 6. AKILLI SIRALAYICILAR (PERLERİ ARALARINDA BOŞLUKLA DİZER)
        document.getElementById('btnSortRuns').addEventListener('click', () => {
            const currentTiles = this.ui.getCurrentHandFromSlots();
            const slots = this.engine.arrangeByRuns(currentTiles);
            this.sound.playTileMove();
            this.ui.setSlots(slots);
            this.ui.setStatus('Taşlar seri perler halinde aralarında boşlukla dizildi.');
            this.ui.update101Tracker(this.engine);
        });

        document.getElementById('btnSortSets').addEventListener('click', () => {
            const currentTiles = this.ui.getCurrentHandFromSlots();
            const slots = this.engine.arrangeBySets(currentTiles);
            this.sound.playTileMove();
            this.ui.setSlots(slots);
            this.ui.setStatus('Taşlar aynı sayılar (düz perler) halinde dizildi.');
            this.ui.update101Tracker(this.engine);
        });

        document.getElementById('btnSortPairs').addEventListener('click', () => {
            const currentTiles = this.ui.getCurrentHandFromSlots();
            const slots = this.engine.arrangeByPairs(currentTiles);
            this.sound.playTileMove();
            this.ui.setSlots(slots);
            this.ui.setStatus('Çiftler yan yana ve aralarında boşlukla dizildi.');
            this.ui.update101Tracker(this.engine);
        });

        // 7. 101 El Açma Düğmesi
        const btnOpen101 = document.getElementById('btnOpen101');
        if (btnOpen101) {
            btnOpen101.addEventListener('click', () => {
                this.handleOpen101();
            });
        }

        // 8. Eli Bitirme Düğmesi
        document.getElementById('btnFinish').addEventListener('click', () => {
            this.handlePlayerFinish();
        });

        // 9. Yeni Oyun Düğmesi
        document.getElementById('btnNewGame').addEventListener('click', () => {
            this.startNewRound();
        });

        // 10. Ses Düğmesi
        const btnSound = document.getElementById('btnSound');
        const soundIcon = document.getElementById('soundIcon');
        btnSound.addEventListener('click', () => {
            const enabled = this.sound.toggle();
            soundIcon.textContent = enabled ? '🔊' : '🔇';
        });

        // 11. Kurallar Modalı
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
        this.ui.update101Tracker(this.engine);
    }

    // Yuva tıklaması (Seçim / Taş taşıma)
    handleSlotClick(slotIndex) {
        const clickedTile = this.ui.istakaSlots[slotIndex];

        // 1. Zaten seçili bir taş varsa:
        if (this.ui.selectedSlotIndex !== null) {
            // Aynı taşa tekrar tıklandıysa seçimi kaldır
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
            this.ui.update101Tracker(this.engine);
            return;
        }

        // 2. Tıklanan yuvada taş varsa seç
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

        const res = this.engine.discardTile(0, tileToDiscard.id);
        if (res) {
            this.sound.playTileDiscard();
            this.ui.istakaSlots[this.ui.selectedSlotIndex] = null;
            this.ui.clearSelection();
            this.ui.renderIstaka();
            this.ui.renderTable(this.engine);

            // Sıra Doğu'ya geçti, AI turlarını çalıştır
            this.executeAiTurns();
        }
    }

    // 101'de El Açma
    handleOpen101() {
        if (this.engine.turn !== 0) {
            this.ui.setStatus('Sıra sizde değilken el açamazsınız!');
            return;
        }

        const hand = this.ui.getCurrentHandFromSlots();
        const evalRes = this.engine.evaluate101Hand(hand);

        if (!evalRes.canOpen) {
            this.ui.setStatus('Eliniz henüz açmak için yetersiz! (En az 101 puan veya 5 çift gereklidir)');
            return;
        }

        const type = evalRes.canOpenRuns ? 'runs' : 'pairs';
        const res = this.engine.open101Hand(0, type);

        if (res.success) {
            this.sound.playTileMove();
            // Kalan taşları ıstakaya yeniden yerleştir
            this.ui.syncHandToIstaka(this.engine.players[0].tiles);
            this.ui.renderTable(this.engine);
            this.ui.setStatus(`Tebrikler! ${type === 'runs' ? res.score + ' puan ile' : '5 çift ile'} elinizi açtınız. Fazla taşınızı atabilirsiniz.`);
        }
    }

    // Eli Bitirme Kontrolü
    handlePlayerFinish() {
        if (this.engine.turn !== 0 || this.engine.turnPhase !== 'discard') {
            this.ui.setStatus('Eli bitirmek için önce taş çekmelisiniz!');
            return;
        }

        const hand = this.ui.getCurrentHandFromSlots();

        if (this.engine.gameMode === '101') {
            // 101'de bitiş: Istakadaki tüm taşlar açılmış ve 1 taş kalmışsa o taş atılarak biter
            if (hand.length === 1) {
                this.sound.playWin();
                this.engine.discardTile(0, hand[0].id);
                this.ui.renderTable(this.engine);

                document.getElementById('winPlayerName').textContent = 'Tebrikler, 101 Elini Bitirdiniz! 🏆';
                document.getElementById('winDescription').textContent = 'Tüm perlerinizi açarak son taşınızı başarıyla attınız!';
                document.getElementById('modalWin').classList.add('active');
                return;
            } else {
                this.ui.setStatus('101 elini bitirmek için tüm perlerinizi açıp elinizde sadece 1 atılacak taş kalmalıdır!');
                return;
            }
        }

        // Klasik Düz Okey Bitişi
        if (hand.length !== 15) {
            this.ui.setStatus('Eli bitirmek için 15 taşınız olmalı (14 per + 1 atılacak taş)!');
            return;
        }

        let winFound = false;
        let discardCandidate = null;

        for (const candidate of hand) {
            const rem14 = hand.filter(t => t.id !== candidate.id);
            const check = this.engine.checkClassicWin(rem14);
            if (check.canWin) {
                winFound = true;
                discardCandidate = candidate;
                break;
            }
        }

        if (winFound) {
            this.sound.playWin();
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

    // AI Bot Turlarını Çalıştır
    async executeAiTurns() {
        this.isAiRunning = true;

        while (this.engine.turn !== 0 && !this.engine.gameOver) {
            const currentAi = this.engine.turn;
            const aiName = this.engine.players[currentAi].name;

            this.ui.setStatus(`${aiName} düşünüyor...`);
            this.ui.renderTable(this.engine);
            await this.sleep(700);

            // 1. Taş Çekme
            const drawChoice = this.engine.decideAiDraw(currentAi);
            if (drawChoice === 'discard') {
                this.engine.drawFromDiscard(currentAi);
            } else {
                this.engine.drawFromDeck(currentAi);
            }
            this.sound.playTileDraw();
            this.ui.renderTable(this.engine);

            await this.sleep(600);

            // 2. 101 Modunda AI El Açma Kontrolü
            if (this.engine.gameMode === '101' && !this.engine.players[currentAi].hasOpened) {
                const evalRes = this.engine.evaluate101Hand(this.engine.players[currentAi].tiles);
                if (evalRes.canOpen) {
                    const type = evalRes.canOpenRuns ? 'runs' : 'pairs';
                    this.engine.open101Hand(currentAi, type);
                    this.sound.playTileMove();
                    this.ui.setStatus(`${aiName} elini masaya açtı! (${evalRes.totalScore} Puan)`);
                    this.ui.renderTable(this.engine);
                    await this.sleep(800);
                }
            }

            // 3. Bitirme Kontrolü
            if (this.engine.gameMode === '101') {
                if (this.engine.players[currentAi].hasOpened && this.engine.players[currentAi].tiles.length === 1) {
                    this.sound.playWin();
                    const lastTile = this.engine.players[currentAi].tiles[0];
                    this.engine.discardTile(currentAi, lastTile.id);
                    this.ui.renderTable(this.engine);

                    document.getElementById('winPlayerName').textContent = `${aiName} Kazandı! 🤖`;
                    document.getElementById('winDescription').textContent = `${aiName} 101 elini bitirdi.`;
                    document.getElementById('modalWin').classList.add('active');
                    this.isAiRunning = false;
                    return;
                }
            } else {
                const aiHand = this.engine.players[currentAi].tiles;
                for (const candidate of aiHand) {
                    const rem14 = aiHand.filter(t => t.id !== candidate.id);
                    if (this.engine.checkClassicWin(rem14).canWin) {
                        this.sound.playWin();
                        this.engine.discardTile(currentAi, candidate.id);
                        this.ui.renderTable(this.engine);

                        document.getElementById('winPlayerName').textContent = `${aiName} Kazandı! 🤖`;
                        document.getElementById('winDescription').textContent = `${aiName} eli bitirdi.`;
                        document.getElementById('modalWin').classList.add('active');
                        this.isAiRunning = false;
                        return;
                    }
                }
            }

            // 4. Taş Atma
            const discardTileId = this.engine.decideAiDiscard(currentAi);
            this.engine.discardTile(currentAi, discardTileId);
            this.sound.playTileDiscard();
            this.ui.renderTable(this.engine);

            await this.sleep(600);
        }

        this.isAiRunning = false;
        this.ui.renderTable(this.engine);
        this.ui.setStatus('Sıra sizde! Desteden veya solunuzdaki Batı\'nın attığı taştan çekin.');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.okeyApp = new OkeyApp();
});
