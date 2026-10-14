// Okey Oyun ve Kural Motoru (Okey Deck, Distribution, Melds & AI Logic)

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
        this.isFake = isFake;     // Sahte Okey mi?
        this.isOkey = false;      // Gerçek Okey mi? (Dağıtımda belirlenir)
    }

    clone() {
        const copy = new OkeyTile(this.id, this.color, this.value, this.isFake);
        copy.isOkey = this.isOkey;
        return copy;
    }
}

class OkeyEngine {
    constructor() {
        this.reset();
    }

    reset() {
        this.deck = [];
        this.indicator = null; // Gösterge taşı
        this.okeyColor = null; // Okey'in rengi
        this.okeyValue = null; // Okey'in değeri
        this.players = [
            { id: 0, name: 'Siz', isHuman: true, tiles: [] },
            { id: 1, name: 'Doğu', isHuman: false, tiles: [] },
            { id: 2, name: 'Kuzey', isHuman: false, tiles: [] },
            { id: 3, name: 'Batı', isHuman: false, tiles: [] }
        ];
        this.turn = 0;              // 0: Siz, 1: Doğu, 2: Kuzey, 3: Batı
        this.turnPhase = 'draw';    // 'draw' | 'discard'
        this.discards = [[], [], [], []]; // Her oyuncunun sağındaki atık taşlar
        this.gameOver = false;
        this.winner = null;
        this.winType = null;        // 'normal' | 'cift' | 'okey_atarak'
        this.scores = [20, 20, 20, 20]; // Düşmeli Okey (Herkes 20 puandan başlar)
    }

    // 106 taşlık desteyi oluştur
    generateDeck() {
        const deck = [];
        let idCounter = 1;

        // 4 Renk, 1-13 arası, her taştan 2'şer adet (Toplam 104 taş)
        for (let set = 0; set < 2; set++) {
            for (const color of OKEY_COLORS) {
                for (let val = 1; val <= 13; val++) {
                    deck.push(new OkeyTile(idCounter++, color, val, false));
                }
            }
        }

        // 2 adet Sahte Okey
        deck.push(new OkeyTile(idCounter++, 'fake', 0, true));
        deck.push(new OkeyTile(idCounter++, 'fake', 0, true));

        // Karıştır (Fisher-Yates Shuffle)
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }

        return deck;
    }

    // Yeni el başlat ve taşları dağıt
    startRound(starterPlayerIndex = 0) {
        this.deck = this.generateDeck();
        this.discards = [[], [], [], []];
        this.gameOver = false;
        this.winner = null;
        this.winType = null;
        this.turn = starterPlayerIndex;
        this.turnPhase = 'discard'; // Başlayan oyuncu 15 taşla başlar ve doğrudan taş atar

        // Gösterge taşını belirle (Sahte okey gelirse tekrar seç)
        let indicatorIdx = 0;
        while (this.deck[indicatorIdx].isFake) {
            indicatorIdx++;
        }
        this.indicator = this.deck.splice(indicatorIdx, 1)[0];

        // Okey taşı: Göstergenin aynı rengi ve 1 fazlası (13 ise 1)
        this.okeyColor = this.indicator.color;
        this.okeyValue = this.indicator.value === 13 ? 1 : (this.indicator.value + 1);

        // Desteyi tara ve Okey / Sahte Okey özelliklerini ata
        for (const tile of this.deck) {
            if (!tile.isFake && tile.color === this.okeyColor && tile.value === this.okeyValue) {
                tile.isOkey = true;
            }
            if (tile.isFake) {
                // Sahte okey, okeyin yerine geçen taştır
                tile.color = this.okeyColor;
                tile.value = this.okeyValue;
            }
        }

        // Taşları dağıt:
        // Başlayan oyuncuya 15 taş, diğerlerine 14 taş
        for (let p = 0; p < 4; p++) {
            const count = (p === starterPlayerIndex) ? 15 : 14;
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

        // Sırayı sonraki oyuncuya geçir
        this.turn = (this.turn + 1) % 4;
        this.turnPhase = 'draw';

        return discardedTile;
    }

    // ================== EL VE PER KONTROLÜ (WIN VALIDATOR) ==================

    // 14 taşın tamamen geçerli perlerden oluşup oluşmadığını kontrol et
    checkWinningHand(tiles) {
        if (tiles.length !== 14) return { canWin: false };

        // 1. Çift kontrolü (7 çift)
        const pairCheck = this.checkPairs(tiles);
        if (pairCheck.isWin) {
            return { canWin: true, type: 'cift', melds: pairCheck.pairs };
        }

        // 2. Normal seri ve düz per kontrolü
        const meldCheck = this.findValidMeldsPartition(tiles);
        if (meldCheck.isWin) {
            return { canWin: true, type: 'normal', melds: meldCheck.melds };
        }

        return { canWin: false };
    }

    // 7 Çift Kontrolü
    checkPairs(tiles) {
        const sorted = [...tiles];
        const okeys = [];
        const normal = [];

        for (const t of sorted) {
            if (t.isOkey) okeys.push(t);
            else normal.push(t);
        }

        // Normal taşları grupla
        const counts = {};
        for (const t of normal) {
            const key = `${t.color}-${t.value}`;
            counts[key] = (counts[key] || 0) + 1;
        }

        let pairsCount = 0;
        let singleCount = 0;

        for (const key in counts) {
            pairsCount += Math.floor(counts[key] / 2);
            if (counts[key] % 2 === 1) singleCount++;
        }

        // Okeyler tek kalan taşları çifte tamamlayabilir
        let okeyLeft = okeys.length;
        while (singleCount > 0 && okeyLeft > 0) {
            singleCount--;
            okeyLeft--;
            pairsCount++;
        }

        // Kalan okeyler birbirleriyle çift oluşturabilir
        pairsCount += Math.floor(okeyLeft / 2);

        return { isWin: pairsCount === 7, pairs: pairsCount };
    }

    // 14 taşı geçerli perlere bölebilen kombinasyonu bul
    findValidMeldsPartition(tiles) {
        const okeys = tiles.filter(t => t.isOkey);
        const regular = tiles.filter(t => !t.isOkey);

        // Olası tüm perleri bul
        const allPossibleMelds = this.generateAllPossibleMelds(regular, okeys.length);
        if (allPossibleMelds.length === 0) return { isWin: false };

        // Per kombinasyonlarıyla 14 taşın tamamını kapsayan küme var mı ara (Exact Cover)
        const solution = this.findExactCover(tiles, allPossibleMelds);
        if (solution) {
            return { isWin: true, melds: solution };
        }

        return { isWin: false };
    }

    // Verilen taşlarla oluşturulabilecek tüm geçerli perleri listele
    generateAllPossibleMelds(regularTiles, okeyCount) {
        const melds = [];

        // 1. Düz Perler (Aynı sayı, farklı renkler: 3'lü veya 4'lü)
        const byValue = {};
        for (const t of regularTiles) {
            if (!byValue[t.value]) byValue[t.value] = [];
            byValue[t.value].push(t);
        }

        for (const val in byValue) {
            const list = byValue[val];
            // Renkleri tekilleştir
            const uniqueColors = {};
            for (const t of list) {
                if (!uniqueColors[t.color]) uniqueColors[t.color] = t;
            }
            const uniqueList = Object.values(uniqueColors);

            // 3'lü veya 4'lü kombinasyonlar (Okey destekli)
            for (let neededOkey = 0; neededOkey <= okeyCount; neededOkey++) {
                const totalSize = uniqueList.length + neededOkey;
                if (totalSize >= 3 && totalSize <= 4) {
                    melds.push({
                        type: 'set',
                        tiles: [...uniqueList],
                        okeyCount: neededOkey
                    });
                }
            }
        }

        // 2. Seri Perler (Aynı renk, ardışık sayılar)
        const byColor = {};
        for (const t of regularTiles) {
            if (!byColor[t.color]) byColor[t.color] = [];
            byColor[t.color].push(t);
        }

        for (const col in byColor) {
            const list = byColor[col].sort((a, b) => a.value - b.value);
            // Ardışık alt dizileri ara
            for (let i = 0; i < list.length; i++) {
                let current = [list[i]];
                let prevVal = list[i].value;

                for (let j = i + 1; j < list.length; j++) {
                    if (list[j].value === prevVal + 1) {
                        current.push(list[j]);
                        prevVal = list[j].value;
                        if (current.length >= 3) {
                            melds.push({
                                type: 'run',
                                color: col,
                                tiles: [...current],
                                okeyCount: 0
                            });
                        }
                    }
                }

                // 12-13-1 Serisi özel kontrolü
                const has12 = list.some(t => t.value === 12);
                const has13 = list.some(t => t.value === 13);
                const has1 = list.some(t => t.value === 1);
                if (has12 && has13 && has1) {
                    const t12 = list.find(t => t.value === 12);
                    const t13 = list.find(t => t.value === 13);
                    const t1 = list.find(t => t.value === 1);
                    melds.push({
                        type: 'run',
                        color: col,
                        tiles: [t12, t13, t1],
                        okeyCount: 0
                    });
                }
            }
        }

        return melds;
    }

    // Exact cover ile 14 taşı eşleştir
    findExactCover(allTiles, candidateMelds) {
        const totalTilesCount = allTiles.length;
        const totalOkeys = allTiles.filter(t => t.isOkey).length;

        function search(meldIndex, usedTileIds, usedOkeys, currentMelds) {
            if (usedTileIds.size + usedOkeys === 14 && usedOkeys <= totalOkeys) {
                return currentMelds;
            }

            for (let i = meldIndex; i < candidateMelds.length; i++) {
                const meld = candidateMelds[i];
                if (usedOkeys + meld.okeyCount > totalOkeys) continue;

                // Çakışma kontrolü
                let conflict = false;
                for (const t of meld.tiles) {
                    if (usedTileIds.has(t.id)) {
                        conflict = true;
                        break;
                    }
                }
                if (conflict) continue;

                // Ekle
                for (const t of meld.tiles) usedTileIds.add(t.id);
                const result = search(
                    i + 1,
                    usedTileIds,
                    usedOkeys + meld.okeyCount,
                    [...currentMelds, meld]
                );
                if (result) return result;

                // Geri al
                for (const t of meld.tiles) usedTileIds.delete(t.id);
            }

            return null;
        }

        return search(0, new Set(), 0, []);
    }

    // ================== AKILLI EL DÜZENLEME (ISTAKA SIRALAMA) ==================

    // Seriye Göre Diz (Renk renk ve küçükten büyüğe)
    sortHandByRuns(tiles) {
        return [...tiles].sort((a, b) => {
            if (a.isOkey && !b.isOkey) return -1;
            if (!a.isOkey && b.isOkey) return 1;
            if (a.color !== b.color) {
                return OKEY_COLORS.indexOf(a.color) - OKEY_COLORS.indexOf(b.color);
            }
            return a.value - b.value;
        });
    }

    // Renge / Düz Perlere Göre Diz (Aynı numaralar yan yana)
    sortHandBySets(tiles) {
        return [...tiles].sort((a, b) => {
            if (a.isOkey && !b.isOkey) return -1;
            if (!a.isOkey && b.isOkey) return 1;
            if (a.value !== b.value) {
                return a.value - b.value;
            }
            return OKEY_COLORS.indexOf(a.color) - OKEY_COLORS.indexOf(b.color);
        });
    }

    // Çifte Göre Diz (Aynı renk ve aynı değerler yan yana)
    sortHandByPairs(tiles) {
        const sorted = [...tiles].sort((a, b) => {
            if (a.isOkey && !b.isOkey) return -1;
            if (!a.isOkey && b.isOkey) return 1;
            const keyA = `${a.color}-${a.value}`;
            const keyB = `${b.color}-${b.value}`;
            return keyA.localeCompare(keyB);
        });
        return sorted;
    }

    // ================== YAPAY ZEKA (AI BOT BOTLARI) ==================

    // AI Karar Verme (Taş Çekme)
    decideAiDraw(playerIndex) {
        const prevPlayer = (playerIndex + 3) % 4;
        const discardPile = this.discards[prevPlayer];

        if (discardPile.length > 0) {
            const candidateTile = discardPile[discardPile.length - 1];
            // Yerdeki taş işimize yarıyor mu? (Seri veya düz pere uyuyor mu?)
            if (this.isTileUseful(this.players[playerIndex].tiles, candidateTile)) {
                return 'discard';
            }
        }

        return 'deck';
    }

    // AI Karar Verme (Taş Atma)
    decideAiDiscard(playerIndex) {
        const tiles = this.players[playerIndex].tiles;

        // Okey taşları asla atılmaz
        const nonOkeys = tiles.filter(t => !t.isOkey);
        if (nonOkeys.length === 0) return tiles[0].id;

        // Her taşın ıstakadaki fayda puanını hesapla (En işe yaramayanı at)
        let worstTile = nonOkeys[0];
        let lowestUtility = Infinity;

        for (const t of nonOkeys) {
            const utility = this.calculateTileUtility(tiles, t);
            if (utility < lowestUtility) {
                lowestUtility = utility;
                worstTile = t;
            }
        }

        return worstTile.id;
    }

    // Bir taşın ıstakadaki faydası (Komşulukları, aynı sayıları var mı?)
    calculateTileUtility(hand, tile) {
        let utility = 0;

        for (const other of hand) {
            if (other.id === tile.id) continue;

            // Aynı değer, farklı renk (Düz per adayı)
            if (other.value === tile.value && other.color !== tile.color) {
                utility += 10;
            }

            // Aynı renk, ardışık sayı (Seri per adayı)
            if (other.color === tile.color) {
                const diff = Math.abs(other.value - tile.value);
                if (diff === 1) utility += 12; // Yan yana
                else if (diff === 2) utility += 5; // Araya taş bekleniyor
            }

            // Tam çifti var mı?
            if (other.color === tile.color && other.value === tile.value) {
                utility += 8;
            }
        }

        return utility;
    }

    // Yerdeki taş faydalı mı?
    isTileUseful(hand, tile) {
        if (tile.isOkey) return true; // Okey asla kaçırılmaz!
        const utility = this.calculateTileUtility(hand, tile);
        return utility >= 10;
    }
}

// Global veya export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { OkeyEngine, OkeyTile, OKEY_COLORS, COLOR_NAMES_TR };
} else {
    window.OkeyEngine = OkeyEngine;
    window.OkeyTile = OkeyTile;
    window.OKEY_COLORS = OKEY_COLORS;
    window.COLOR_NAMES_TR = COLOR_NAMES_TR;
}
