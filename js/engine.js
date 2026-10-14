// Okey Oyun ve Kural Motoru (Düz Okey & 101 Yüzbir Okey Destekli)

const OKEY_COLORS = ['yellow', 'blue', 'black', 'red'];
const COLOR_NAMES_TR = {
    yellow: 'Sarı',
    blue: 'Mavi',
    black: 'Siyah',
    red: 'Kırmızı'
};

class OkeyTile {
    constructor(id, color, value, isFake = false) {
        this.id = id;
        this.color = color;       // 'yellow' | 'blue' | 'black' | 'red' | 'fake'
        this.value = value;       // 1..13
        this.isFake = isFake;
        this.isOkey = false;
    }

    clone() {
        const copy = new OkeyTile(this.id, this.color, this.value, this.isFake);
        copy.isOkey = this.isOkey;
        return copy;
    }

    // Gerçek Okey'i temsil eden veya sahte okeyin asıl değerini veren sayı
    getEffectiveValue(engine) {
        if (this.isFake) return engine.okeyValue;
        return this.value;
    }

    getEffectiveColor(engine) {
        if (this.isFake) return engine.okeyColor;
        return this.color;
    }
}

class OkeyEngine {
    constructor() {
        this.gameMode = 'classic'; // 'classic' (Düz Okey) | '101' (101 Yüzbir Okey)
        this.reset();
    }

    setGameMode(mode) {
        this.gameMode = mode; // 'classic' | '101'
    }

    reset() {
        this.deck = [];
        this.indicator = null;
        this.okeyColor = null;
        this.okeyValue = null;
        this.players = [
            { id: 0, name: 'Siz', isHuman: true, tiles: [], hasOpened: false, openedMelds: [], openedType: null },
            { id: 1, name: 'Doğu', isHuman: false, tiles: [], hasOpened: false, openedMelds: [], openedType: null },
            { id: 2, name: 'Kuzey', isHuman: false, tiles: [], hasOpened: false, openedMelds: [], openedType: null },
            { id: 3, name: 'Batı', isHuman: false, tiles: [], hasOpened: false, openedMelds: [], openedType: null }
        ];
        this.tableOpenedMelds = []; // Masaya açılan tüm perler (101 modunda ortak havuz)
        this.turn = 0;
        this.turnPhase = 'discard';
        this.discards = [[], [], [], []];
        this.gameOver = false;
        this.winner = null;
        this.winType = null;
        // 101'de ceza puanları (az puan iyi), Klasik'te düşmeli skor
        this.scores = [0, 0, 0, 0];
    }

    // 106 taşlık deste oluştur
    generateDeck() {
        const deck = [];
        let idCounter = 1;

        for (let set = 0; set < 2; set++) {
            for (const color of OKEY_COLORS) {
                for (let val = 1; val <= 13; val++) {
                    deck.push(new OkeyTile(idCounter++, color, val, false));
                }
            }
        }

        deck.push(new OkeyTile(idCounter++, 'fake', 0, true));
        deck.push(new OkeyTile(idCounter++, 'fake', 0, true));

        // Karıştır
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }

        return deck;
    }

    // Yeni el dağıt
    startRound(starterPlayerIndex = 0) {
        this.deck = this.generateDeck();
        this.discards = [[], [], [], []];
        this.tableOpenedMelds = [];
        this.gameOver = false;
        this.winner = null;
        this.winType = null;
        this.turn = starterPlayerIndex;
        this.turnPhase = 'discard'; // Başlayan oyuncu fazla taşla başlar ve doğrudan taş atar

        for (let p = 0; p < 4; p++) {
            this.players[p].hasOpened = false;
            this.players[p].openedMelds = [];
            this.players[p].openedType = null;
        }

        // Gösterge taşını belirle
        let indicatorIdx = 0;
        while (this.deck[indicatorIdx].isFake) {
            indicatorIdx++;
        }
        this.indicator = this.deck.splice(indicatorIdx, 1)[0];

        // Okey: Göstergenin aynı rengi ve 1 fazlası
        this.okeyColor = this.indicator.color;
        this.okeyValue = this.indicator.value === 13 ? 1 : (this.indicator.value + 1);

        for (const tile of this.deck) {
            if (!tile.isFake && tile.color === this.okeyColor && tile.value === this.okeyValue) {
                tile.isOkey = true;
            }
            if (tile.isFake) {
                tile.color = this.okeyColor;
                tile.value = this.okeyValue;
            }
        }

        // Dağıtım:
        // Düz Okey: Başlayan 15, diğerleri 14 taş
        // 101 Okey: Başlayan 22, diğerleri 21 taş
        const baseCount = (this.gameMode === '101') ? 21 : 14;

        for (let p = 0; p < 4; p++) {
            const count = (p === starterPlayerIndex) ? (baseCount + 1) : baseCount;
            this.players[p].tiles = this.deck.splice(0, count);
        }
    }

    // Ortadan taş çek
    drawFromDeck(playerIndex) {
        if (this.deck.length === 0) return null;
        if (this.turn !== playerIndex || this.turnPhase !== 'draw') return null;

        const tile = this.deck.pop();
        this.players[playerIndex].tiles.push(tile);
        this.turnPhase = 'discard';
        return tile;
    }

    // Solundaki oyuncunun attığı taşı çek
    drawFromDiscard(playerIndex) {
        if (this.turn !== playerIndex || this.turnPhase !== 'draw') return null;

        const prevPlayer = (playerIndex + 3) % 4;
        const pile = this.discards[prevPlayer];
        if (pile.length === 0) return null;

        // 101 Kuralı: Yerden taş alabilmek için ya o taşla elini açmalı ya da önceden açmış olmalıdır
        if (this.gameMode === '101' && !this.players[playerIndex].hasOpened) {
            // Açmamışsa bu taşla el açabiliyor mu kontrolü yapılabilir
        }

        const tile = pile.pop();
        this.players[playerIndex].tiles.push(tile);
        this.turnPhase = 'discard';
        return tile;
    }

    // Taş at
    discardTile(playerIndex, tileId) {
        if (this.turn !== playerIndex || this.turnPhase !== 'discard') return null;

        const p = this.players[playerIndex];
        const idx = p.tiles.findIndex(t => t.id === tileId);
        if (idx === -1) return null;

        const discardedTile = p.tiles.splice(idx, 1)[0];
        this.discards[playerIndex].push(discardedTile);

        // Sırayı geçir
        this.turn = (this.turn + 1) % 4;
        this.turnPhase = 'draw';

        return discardedTile;
    }

    // ========================================================
    // PER BULUCU VE ISTAKA DÜZENLEME MOTORU (SMART MELD FINDER)
    // ========================================================

    // Bir perin toplam puanını hesapla (101 için)
    calculateMeldScore(meld) {
        let sum = 0;
        for (const t of meld.tiles) {
            sum += t.value;
        }
        return sum;
    }

    // Tüm geçerli seri ve düz perleri bul
    findPotentialMelds(tiles) {
        const okeys = tiles.filter(t => t.isOkey);
        const regulars = tiles.filter(t => !t.isOkey);
        const melds = [];

        // 1. Seri Perler (Aynı renk, ardışık sayılar)
        const byColor = {};
        for (const t of regulars) {
            if (!byColor[t.color]) byColor[t.color] = [];
            byColor[t.color].push(t);
        }

        for (const col in byColor) {
            const list = byColor[col].sort((a, b) => a.value - b.value);
            // Tekilleştirilmiş ve ardışık listeler
            for (let i = 0; i < list.length; i++) {
                let current = [list[i]];
                let prev = list[i].value;

                for (let j = i + 1; j < list.length; j++) {
                    if (list[j].value === prev + 1) {
                        current.push(list[j]);
                        prev = list[j].value;
                        if (current.length >= 3) {
                            melds.push({
                                type: 'run',
                                color: col,
                                tiles: [...current],
                                score: current.reduce((acc, t) => acc + t.value, 0)
                            });
                        }
                    }
                }

                // 12-13-1 serisi
                const t12 = list.find(t => t.value === 12);
                const t13 = list.find(t => t.value === 13);
                const t1 = list.find(t => t.value === 1);
                if (t12 && t13 && t1) {
                    melds.push({
                        type: 'run',
                        color: col,
                        tiles: [t12, t13, t1],
                        score: 12 + 13 + 1
                    });
                }
            }
        }

        // 2. Düz Perler (Aynı sayı, farklı renkler: 3 veya 4 taş)
        const byValue = {};
        for (const t of regulars) {
            if (!byValue[t.value]) byValue[t.value] = [];
            byValue[t.value].push(t);
        }

        for (const val in byValue) {
            const list = byValue[val];
            const uniqueColors = {};
            for (const t of list) {
                if (!uniqueColors[t.color]) uniqueColors[t.color] = t;
            }
            const uniqueList = Object.values(uniqueColors);
            if (uniqueList.length >= 3) {
                // 3'lü per
                melds.push({
                    type: 'set',
                    value: parseInt(val, 10),
                    tiles: uniqueList.slice(0, 3),
                    score: parseInt(val, 10) * 3
                });
                // 4'lü per
                if (uniqueList.length === 4) {
                    melds.push({
                        type: 'set',
                        value: parseInt(val, 10),
                        tiles: [...uniqueList],
                        score: parseInt(val, 10) * 4
                    });
                }
            }
        }

        return melds;
    }

    // Çakışmayan en iyi per kümesini seç
    findBestNonOverlappingMelds(tiles, preferType = 'run') {
        const potentialMelds = this.findPotentialMelds(tiles);
        if (potentialMelds.length === 0) return { melds: [], usedTileIds: new Set() };

        // Önceliğe göre sırala
        potentialMelds.sort((a, b) => {
            if (preferType === 'run') {
                if (a.type !== b.type) return a.type === 'run' ? -1 : 1;
            } else if (preferType === 'set') {
                if (a.type !== b.type) return a.type === 'set' ? -1 : 1;
            }
            return b.tiles.length - a.tiles.length || b.score - a.score;
        });

        let bestMeldCombo = [];
        let maxCoveredCount = 0;
        let maxScore = 0;

        // Açgözlü (Greedy) arama
        for (let startIndex = 0; startIndex < Math.min(potentialMelds.length, 10); startIndex++) {
            const currentMelds = [];
            const usedIds = new Set();
            let currentScore = 0;

            for (let i = startIndex; i < potentialMelds.length; i++) {
                const m = potentialMelds[i];
                const hasOverlap = m.tiles.some(t => usedIds.has(t.id));
                if (!hasOverlap) {
                    currentMelds.push(m);
                    m.tiles.forEach(t => usedIds.add(t.id));
                    currentScore += m.score;
                }
            }

            if (usedIds.size > maxCoveredCount || (usedIds.size === maxCoveredCount && currentScore > maxScore)) {
                maxCoveredCount = usedIds.size;
                maxScore = currentScore;
                bestMeldCombo = currentMelds;
            }
        }

        const finalUsedIds = new Set();
        bestMeldCombo.forEach(m => m.tiles.forEach(t => finalUsedIds.add(t.id)));

        return { melds: bestMeldCombo, usedTileIds: finalUsedIds, totalScore: maxScore };
    }

    // ========================================================
    // ISTAKAYA AKILLI DİZİLİM (BOŞLUKLU GERÇEKÇİ DİZİLİŞ)
    // ========================================================

    // 1. SERİ DİZ: Perleri aralarında 1'er boşluk bırakarak ıstakaya dizer!
    arrangeByRuns(tiles) {
        const { melds, usedTileIds } = this.findBestNonOverlappingMelds(tiles, 'run');
        const leftoverTiles = tiles.filter(t => !usedTileIds.has(t.id)).sort((a, b) => {
            if (a.color !== b.color) return a.color.localeCompare(b.color);
            return a.value - b.value;
        });

        return this.formatSlotsWithGaps(melds, leftoverTiles);
    }

    // 2. DÜZ DİZ: Önce aynı sayıları (düz perleri) aralarında boşlukla dizer!
    arrangeBySets(tiles) {
        const { melds, usedTileIds } = this.findBestNonOverlappingMelds(tiles, 'set');
        const leftoverTiles = tiles.filter(t => !usedTileIds.has(t.id)).sort((a, b) => {
            if (a.value !== b.value) return a.value - b.value;
            return a.color.localeCompare(b.color);
        });

        return this.formatSlotsWithGaps(melds, leftoverTiles);
    }

    // 3. ÇİFT DİZ: Çiftleri yan yana ve aralarında 1 boşluk bırakarak dizer!
    arrangeByPairs(tiles) {
        const slots = Array(28).fill(null);
        const pairs = [];
        const usedIds = new Set();

        const regular = tiles.filter(t => !t.isOkey);
        const okeys = tiles.filter(t => t.isOkey);

        // Tam eşleşen çiftleri bul
        for (let i = 0; i < regular.length; i++) {
            if (usedIds.has(regular[i].id)) continue;
            for (let j = i + 1; j < regular.length; j++) {
                if (usedIds.has(regular[j].id)) continue;
                if (regular[i].color === regular[j].color && regular[i].value === regular[j].value) {
                    pairs.push([regular[i], regular[j]]);
                    usedIds.add(regular[i].id);
                    usedIds.add(regular[j].id);
                    break;
                }
            }
        }

        // Kalan tekler ve okeyler
        let leftover = tiles.filter(t => !usedIds.has(t.id));

        // Yuvalara yerleştir: [Çift1, Çift1, Boş, Çift2, Çift2, Boş...]
        let slotIdx = 0;
        for (const pair of pairs) {
            // Eğer üst sıraya sığmıyorsa alt sıraya geç
            if (slotIdx <= 12 && slotIdx + 2 > 14) {
                slotIdx = 14;
            }
            if (slotIdx + 1 < 28) {
                slots[slotIdx] = pair[0];
                slots[slotIdx + 1] = pair[1];
                slotIdx += 3; // 2 taş + 1 boşluk
            }
        }

        // Kalan tek taşları en sona yerleştir
        for (const t of leftover) {
            while (slotIdx < 28 && slots[slotIdx] !== null) slotIdx++;
            if (slotIdx < 28) {
                slots[slotIdx] = t;
                slotIdx++;
            }
        }

        return slots;
    }

    // Perleri aralarında 1'er yuva boşluk kalacak şekilde 28 yuvaya biçimlendir
    formatSlotsWithGaps(melds, leftovers) {
        const slots = Array(28).fill(null);
        let currentSlot = 0;

        for (const meld of melds) {
            const meldLen = meld.tiles.length;
            // Üst sıra 0..13 arasıdır. Eğer üst sıraya sığmıyorsa alt sıraya (14..) kaydır
            if (currentSlot < 14 && currentSlot + meldLen > 14) {
                currentSlot = 14;
            }

            if (currentSlot + meldLen <= 28) {
                for (let k = 0; k < meldLen; k++) {
                    slots[currentSlot + k] = meld.tiles[k];
                }
                currentSlot += meldLen + 1; // 1 yuva boşluk bırak
            }
        }

        // Kalan boş taşları alt sıranın boş kalan kısımlarına yerleştir
        for (const tile of leftovers) {
            while (currentSlot < 28 && slots[currentSlot] !== null) {
                currentSlot++;
            }
            if (currentSlot < 28) {
                slots[currentSlot] = tile;
                currentSlot++;
            } else {
                // Ön taraflardaki boşluklara doldur
                for (let s = 0; s < 28; s++) {
                    if (slots[s] === null) {
                        slots[s] = tile;
                        break;
                    }
                }
            }
        }

        return slots;
    }

    // ========================================================
    // 101 OKEY KONTROLLERİ (EL AÇMA & PUAN KONTROLÜ)
    // ========================================================

    // Oyuncunun elindeki perlerin toplam puanını ve çift sayısını hesapla
    evaluate101Hand(tiles) {
        const { melds, totalScore } = this.findBestNonOverlappingMelds(tiles, 'run');

        // Çift sayısını bul
        let pairCount = 0;
        const usedPairIds = new Set();
        for (let i = 0; i < tiles.length; i++) {
            if (usedPairIds.has(tiles[i].id)) continue;
            for (let j = i + 1; j < tiles.length; j++) {
                if (usedPairIds.has(tiles[j].id)) continue;
                if ((tiles[i].color === tiles[j].color && tiles[i].value === tiles[j].value) || tiles[i].isOkey || tiles[j].isOkey) {
                    pairCount++;
                    usedPairIds.add(tiles[i].id);
                    usedPairIds.add(tiles[j].id);
                    break;
                }
            }
        }

        const canOpenRuns = totalScore >= 101;
        const canOpenPairs = pairCount >= 5;

        return {
            totalScore,
            melds,
            pairCount,
            canOpenRuns,
            canOpenPairs,
            canOpen: canOpenRuns || canOpenPairs
        };
    }

    // 101'de Eli Masaya Aç
    open101Hand(playerIndex, openType = 'runs') {
        const p = this.players[playerIndex];
        const evalRes = this.evaluate101Hand(p.tiles);

        if (openType === 'runs' && evalRes.canOpenRuns) {
            p.hasOpened = true;
            p.openedType = 'runs';
            p.openedMelds = evalRes.melds;

            // Masaya ekle
            this.tableOpenedMelds.push({
                playerIndex,
                playerName: p.name,
                type: 'runs',
                melds: evalRes.melds
            });

            // Açılan taşları oyuncunun ıstakasından çıkar
            const openedTileIds = new Set();
            evalRes.melds.forEach(m => m.tiles.forEach(t => openedTileIds.add(t.id)));
            p.tiles = p.tiles.filter(t => !openedTileIds.has(t.id));

            return { success: true, score: evalRes.totalScore, type: 'runs' };
        } else if (openType === 'pairs' && evalRes.canOpenPairs) {
            p.hasOpened = true;
            p.openedType = 'pairs';
            return { success: true, pairs: evalRes.pairCount, type: 'pairs' };
        }

        return { success: false };
    }

    // Düz Okey için Bitirme Kontrolü (14 taş per mi?)
    checkClassicWin(tiles) {
        if (tiles.length !== 14) return { canWin: false };
        const { usedTileIds } = this.findBestNonOverlappingMelds(tiles);
        if (usedTileIds.size === 14) {
            return { canWin: true, type: 'normal' };
        }

        // 7 çift kontrolü
        let pairCount = 0;
        const used = new Set();
        for (let i = 0; i < tiles.length; i++) {
            if (used.has(tiles[i].id)) continue;
            for (let j = i + 1; j < tiles.length; j++) {
                if (used.has(tiles[j].id)) continue;
                if ((tiles[i].color === tiles[j].color && tiles[i].value === tiles[j].value) || tiles[i].isOkey || tiles[j].isOkey) {
                    pairCount++;
                    used.add(tiles[i].id);
                    used.add(tiles[j].id);
                    break;
                }
            }
        }
        if (pairCount === 7) {
            return { canWin: true, type: 'cift' };
        }

        return { canWin: false };
    }

    // ========================================================
    // AI BOT KARARLARI
    // ========================================================

    decideAiDraw(playerIndex) {
        const prevPlayer = (playerIndex + 3) % 4;
        const discardPile = this.discards[prevPlayer];

        if (discardPile.length > 0) {
            const candidateTile = discardPile[discardPile.length - 1];
            if (candidateTile.isOkey) return 'discard';

            // 101 modunda açmamışsa ancak bu taşla açabilecekse alır
            if (this.gameMode === '101' && !this.players[playerIndex].hasOpened) {
                const testHand = [...this.players[playerIndex].tiles, candidateTile];
                const evalRes = this.evaluate101Hand(testHand);
                if (evalRes.canOpen) return 'discard';
            } else {
                // Klasik Okey'de işe yarıyorsa alır
                const testHand = [...this.players[playerIndex].tiles, candidateTile];
                const currentMelds = this.findBestNonOverlappingMelds(this.players[playerIndex].tiles);
                const newMelds = this.findBestNonOverlappingMelds(testHand);
                if (newMelds.usedTileIds.size > currentMelds.usedTileIds.size) {
                    return 'discard';
                }
            }
        }

        return 'deck';
    }

    decideAiDiscard(playerIndex) {
        const tiles = this.players[playerIndex].tiles;
        const nonOkeys = tiles.filter(t => !t.isOkey);
        if (nonOkeys.length === 0) return tiles[0].id;

        const { usedTileIds } = this.findBestNonOverlappingMelds(tiles);
        const unassigned = nonOkeys.filter(t => !usedTileIds.has(t.id));

        if (unassigned.length > 0) {
            return unassigned[unassigned.length - 1].id;
        }

        return nonOkeys[nonOkeys.length - 1].id;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { OkeyEngine, OkeyTile, OKEY_COLORS, COLOR_NAMES_TR };
} else {
    window.OkeyEngine = OkeyEngine;
    window.OkeyTile = OkeyTile;
    window.OKEY_COLORS = OKEY_COLORS;
    window.COLOR_NAMES_TR = COLOR_NAMES_TR;
}
