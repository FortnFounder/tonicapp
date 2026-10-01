# Tonic — GDD

> Design base, 01/10/2026. Pedido do Fellipe: *"quero o jogo complexo… toda a mecânica possível de variáveis, matemática, cálculo, chance, probabilidade. Quero que o som do jogo seja tão importante quanto a mecânica… realmente baseado em teoria musical."* Ponto de partida: o protótipo `prototype/tonic.html` (o estilo dele foi aprovado: "é MUITO bom, eu continuaria nessa pegada"). Referência de método: repo `distilleryidle` (GDD, simulador, regras da casa).

## 🎸 A ação

**Compor um loop de acordes que a banda toca pra sempre.** Cada compasso toca um acorde; o acorde solta as próprias notas (recurso), paga gorjeta (dinheiro) e rola a sorte do compasso (Solid · Sweet · Soaring · Transcendent). O loop toca com o app fechado.

O tema justifica o idle: banda ensaiando é repetição. O tema justifica a matemática: harmonia **é** matemática (razões de frequência, distância no círculo das quintas, tensão e resolução).

## 🎚️ O filtro (herdado do Distillery)

Toda mecânica deixa o loop **mais rico** (gorjeta por compasso), **mais rápido** (compassos por minuto) ou **mais sortudo** (chance de compasso raro). Não mexe em nenhum dos três, não entra.

| Alavanca | Vem de | Mexe em |
|---|---|---|
| **Harmonia** | os acordes e a ordem deles (fluxo, cadências, progressões famosas, tensão → resolução) | mais rico |
| **Banda** | instrumentos (nível, raridade, equipamento), andamento (BPM) | mais rico · mais rápido |
| **Feel** | instrumento solo, equipamento, modo, Jam | mais sortudo |

## 🎼 O motor de teoria (`src/theory.ts`)

Tudo é calculado, nada é tabela mágica. Fontes na seção Pesquisa.

- **Nota = classe de altura 0–11** relativa à tônica (0 = tônica). Grafia certa por tom: cada grau da escala usa uma letra (F♯ em Ré maior, B♭ em Fá maior).
- **Escala/modo:** os 7 modos da escala maior (Lydian → Locrian, do mais claro pro mais escuro). O modo define o que é diatônico.
- **Acorde = fundamental + qualidade** (maj, min, dim, aug, sus2, sus4, 7, maj7, m7, m7♭5, dim7, add9). Nome em algarismo romano relativo à tônica maior (♭VII, iv, V7/V).
- **Função:** T (tônica: I, e fraca: vi, iii), S (subdominante: ii, IV, ♭VI, ♭VII, ♭II), D (dominante: V, vii°, dominantes secundárias, ♭II7). Calculada pela fundamental e pela qualidade.
- **Dissonância** (Plomp-Levelt): soma por classe de intervalo entre as notas do acorde. ic1 (2ª menor/7ª maior) 1,5 · ic2 1 · ic3 0,2 · ic4 0,1 · ic5 0 · ic6 (trítono) 2.
- **Tensão do acorde (0–10)** (Lerdahl simplificado): função (T 0 · T fraca 1,5 · S 3 · D 5) + dissonância + 1,5 por nota fora do modo. I = 0,3 · vi 1,8 · IV 3,3 · V 5,3 · V7 8,5 · ♭VII 4,8 · V7/V 10.
- **Fluxo de A → B (0–10):** movimento da fundamental (quinta descendo 4 · quinta subindo 2,5 · grau 2,5 · terça 2 · semitom 1,5–2 · trítono 0,5 · repetir 0) + notas em comum × 0,75 + condução de vozes suave (custo mínimo em semitons) + direção funcional (T→S 1,5 · S→D 2 · D→T 3 · S→T 1,5 · D→S −0,5) + especiais (dominante secundária no alvo +3, sensível → tônica +1, ♭II7 → I +2). A ordem bate com as estatísticas do Hooktheory: V→I, IV→V, ii→V, vi→IV no topo.
- **Condução de vozes:** o piano escolhe a inversão mais perto da anterior (algoritmo de custo mínimo); o mesmo número entra no fluxo. O jogador **ouve** a regra que está pontuando.

## 🔁 O compasso (o coração da conta)

Por compasso, com o acorde `c` na casa `k`:

```
gorjeta = Tone × HarmonyMult × Release × Grade × KeyMult × ModeMult × boosts
```

- **Tone** = soma da força dos instrumentos. Força = base do papel × raridade (1 · 3 · 9 · 27) × (1 + 0,2 × (nível − 1)) × (1 + Tone% do equipamento).
- **HarmonyMult** = 0,5 + 1,5 × H/100. **H (0–100)** do loop: fluxo médio (até 55) + variedade (até 15) + casa (tem I: 10) + cadências (perfeita 8, plagal 5, deceptiva 6, sensível 6) + 8 por progressão famosa.
- **Tensão e resolução** (Salimpoor 2011: dopamina na antecipação e no clímax): acorde fora da tônica **acumula** a tensão dele num medidor (teto 30). Quando o loop cai na tônica, **solta**: Release = 1 + acumulado × 0,05 × (1 + Depth). I–IV–V–I acumula 8,6 e paga ×1,43 no I. Cadência deceptiva (V→vi) solta metade, guarda metade e **dobra a chance** do compasso (surpresa).
- **Grade (a sorte do compasso):** Solid ×1 · **Sweet ×3** (8%) · **Soaring ×10** (1,5%) · **Transcendent ×50** (0,15%). Feel multiplica as chances; o compasso que solta tensão ganha + (acumulado ÷ 10) × chance. Teto 60%.
- **Garantia (pity), à mostra:** Soaring+ no máximo a cada 60 compassos, com rampa a partir do 45 (+5% por compasso, igual ao soft pity do Genshin). Transcendent no máximo a cada 500. Contadores na tela.
- **Notas:** cada nota do acorde cai 1 × (1 + Echo%); a fundamental cai em dobro (o baixo dobra a fundamental). Sweet ×2, Soaring ×5, Transcendent ×20 notas e 1 Gold Record. Offline: notas a 50% da eficiência.
- **Fãs:** 0,0015 × H/100 × √grade por compasso; o grosso vem dos Gigs e das descobertas.

## 💰 Moedas e recursos

| Moeda | Entra por | Gasta em |
|---|---|---|
| **Tips ($)** | todo compasso, royalties, gigs | afinar instrumento, BPM, tons, comprar instrumento, loop de 8 |
| **Notes (12 notas)** | compassos (as notas do acorde), Jam, caixotes | aprender acorde, raridade de instrumento, modos |
| **Fans** | compassos, gigs, descobertas | não se gasta: abre lugares, tons e locais |
| **Picks** | Coffee House | Workbench: equipamento +1 a +15 |
| **Sheet Music** | Jazz Cellar | Conservatory: treino de instrumento acima do Legendary (★) |
| **Tape** | Recording Studio | Studio: gravar música (Song) e masterizar |
| **Crates** | pódio de gig, Songbook | equipamento, recursos, notas |
| **Gold Records** | Transcendent, descobertas, marcos | boosts (Encore 2× gorjeta, Spotlight 2× Feel, Roadie +4 h offline) |

Regras herdadas do Distillery: **caixote nunca por dinheiro real**, moeda do jogo nunca à venda, chance **sempre à mostra** antes da decisão, preço fechado na escada 1 · 1,5 · 2 · 2,5 · 3 · 4 · 5 · 6 · 7,5 × 10ⁿ.

## 🥁 A banda (5 papéis)

| Papel | Instrumento | Stat | O som sobe com a raridade |
|---|---|---|---|
| Harmony | Acoustic Guitar | Tone (gorjeta) | batida em semínima → batida pra cima e pra baixo → antecipação → dedilhado |
| Rhythm | Drum Kit | limita o BPM (Common 116, Rare 140, Epic 164, Legendary 176) | bumbo e caixa → chimbal → síncope e chimbal aberto → ghost notes, virada, percussão euclidiana |
| Bass | Bass | Depth (multiplica a soltura) | fundamental → fundamental e quinta → walking → nota de aproximação cromática no próximo acorde |
| Keys | Electric Piano | Tone | acorde inteiro → acorde e mão esquerda → comping sincopado → arpejo na virada |
| Lead | Flute | Feel (sorte) | melodia esparsa → notas do acorde nos tempos fortes e de passagem nos fracos → ornamentos → terça acima nos compassos raros |
| Pad | Strings | Sustain (offline e notas) | entra no Rare: sustenta o acorde e cresce no compasso que solta tensão |

- **Afinar** (Tune) nível 1–10 com dinheiro, custo × 1,6 por nível × 40 por raridade (medido no simulador). No 10, sobe a raridade com as **notas da assinatura** do instrumento (400 · 5.000 · 60.000 de cada): o violão pede as cordas soltas E A D G B, o baixo E A D G, o piano C E G, a flauta B A G, as cordas G D A E. A bateria paga em dinheiro. A raridade nova volta pro nível 1 com força maior que o 10 anterior (2,8 → 3).
- Acima do Legendary: **Mastery ★1–★5** no Conservatory, com Sheet Music e chance.
- **Equipamento:** 2 vagas por instrumento (Pedal e Accessory). Item com raridade, stat principal e até 4 substats (Tone, Feel, Depth, Echo, Sustain, Stage); +3/+6/+9/+12 sorteiam substat nova ou sobem uma (runa do Summoners War).

## 🎲 Workbench (a aba da sorte)

- Melhorar equipamento +1 a +15 com Picks + dinheiro. Chance: +1 a +3 certo; 90 · 80 · 70 · 60 · 50 · 45 · 40 · 35 · 30 · 25 · 20%.
- **Practice (failstack, Black Desert):** cada falha soma 15% da chance base na próxima, teto 90%, zera no sucesso.
- **Medidor:** ponteiro que para onde o sorteio caiu de verdade (sem quase-acerto fabricado; regra da casa). Sucesso toca **cadência perfeita** (V→I); falha toca **cadência deceptiva** (V→vi). O som da sorte é teoria musical.

## 🎤 Gigs (as áreas de farm)

| Local | Abre | Recurso | O júri pede |
|---|---|---|---|
| **Coffee House** | 2 instrumentos | Picks | progressões simples, andamento calmo |
| **Jazz Cellar** | 1º acorde com sétima | Sheet Music | sétimas, ii–V–I, modos |
| **Recording Studio** | 600 fãs | Tape | harmonia alta, tensão |
| **Summer Festival** | 1.500 fãs | Crates + muitos fãs | BPM alto, sorte |

- Cada local tem **níveis 1–10** com dificuldade fixa (a régua não sobe com você; é meta). Alvo do show no nível L = 20 × 2^(L−1) × dificuldade do local (1 · 2,5 · 6 · 15).
- **Show ao vivo:** a banda toca 2 voltas do loop (8 compassos) no palco, com público. Cada compasso conta na tela no estilo Balatro: **Tone (azul) × Mult (vermelho)** e a Grade (dourado) multiplica. O pedido do júri cumprido vale ×1,5.
- **3 bandas rivais** com nota sorteada em volta do alvo (×0,75 · ×0,95 · ×1,15, ±12%). Colocação 1º–4º dá recurso e fãs; caixote com chance (35% no 1º, 15% no 2º, 5% no 3º); 1ª vitória no nível paga ⌈L/2⌉ Gold Records.
- **Chance antes de tocar:** o jogo roda 400 shows de Monte Carlo com as suas chances reais e mostra "1st 54% · Top 2 81%".
- **Bookings:** guarda 5, volta 1 a cada 30 min.

## 🎹 Jam (o modo ativo, opcional)

- Abre com o Lead. Por 2 voltas (8 compassos) aparecem as 7 notas do modo como teclas grandes. Você improvisa: cada toque toca a nota no instrumento solo.
- **Tempo** (janelas generosas de celular): Perfect ±70 ms · Great ±130 ms · Good ±200 ms.
- **Escolha da nota:** nota do acorde no tempo forte = cheia; nota de fora do acorde que **resolve por grau** numa nota do acorde no toque seguinte = ×1,5 (apojatura); nota de fora sem resolver = ×0,5 (choque). Combo multiplica.
- O resultado vira **Hype** (0–100): por 3 min, gorjeta × (1 + Hype/100) e Feel + Hype%. As notas tocadas caem no inventário.

## 🗝️ Tons e modos

- **Círculo das quintas:** cada tom comprado +10% em toda gorjeta e libera as notas dele pra farmar. G 1K · F 5K · D 25K · B♭ 100K · A 500K · E♭ 2,5M · E 10M · A♭ 50M · B 250M · D♭ 1B · F♯ 5B, cada um com um mínimo de fãs.
- **Modos:** Ionian (início) → Mixolydian → Dorian → Aeolian → Lydian → Phrygian → Locrian. Cada um custa a **nota característica** (a que difere do maior) e dinheiro.
- **Assinatura do modo:** loop todo diatônico ao modo e com o acorde característico (Mixolydian ♭VII, Dorian IV maior com i, Aeolian ♭VI, Lydian II, Phrygian ♭II, Locrian i°) ganha ×1,25 e o bônus do modo (Lydian +50% Feel, Mixolydian +25% gorjeta, Dorian +25% notas, Aeolian +50% Depth, Phrygian ×2 na soltura do ♭II→i, Locrian tensão ×2).

## 📚 Vocabulário de acordes (Theory)

Acordes valem em qualquer tom (são relativos à tônica). Abrem em camadas:

| Camada | Abre com | Acordes |
|---|---|---|
| Triads | início | I, IV, V → vi, ii, iii, vii° |
| Sevenths | 40 fãs | V7, Imaj7, ii7, vi7, IVmaj7, iii7, viiø7 |
| Borrowed | 150 fãs | i, iv, ♭III, ♭VI, ♭VII, v |
| Applied | 400 fãs | V7/V, V7/vi, V7/ii, V7/IV, V7/iii |
| Color | 1.000 fãs | ♭II (Napolitano), ♭II7 (sub de trítono), Vsus4, Iadd9, vii°7, II (Lydian) |

Aprender custa as **notas do próprio acorde** no tom atual. Nota cromática (B♭ pra ♭VII em Dó) vem de outros tons, do Jam, de acordes cromáticos e de caixote: **modular pra farmar** é estratégia.

## 📖 Songbook (coleção)

~24 progressões famosas: Three-Chord Trick, Axis (I–V–vi–IV), Doo-Wop, Pop-Punk, ii–V–I, Circle, Royal Road (J-pop), Canon (8 compassos), Andalusian, Mario Cadence (♭VI–♭VII–I), Mixolydian Vamp, Backdoor, Neapolitan, Tritone ii–V, Rhythm Changes, Turnaround, Lament, Dorian Vamp, Lydian Lift, Plagal Amen, Blues (8 compassos), Epic Minor, Sensitive, Royal Road…

- Descoberta paga fãs, dinheiro e Gold Records; raridade da progressão define o tamanho.
- **Mastery:** cada progressão tocada sobe de nível por voltas (25 · 100 · 400 · 1.500 · 5.000); cada nível +2% de gorjeta pra sempre. Coleção com silhueta do que falta (Collection Log do OSRS).

## 💿 Studio (Songs e Charts)

- **Gravar** o loop atual como Song (Tape + dinheiro). Qualidade = H + curva de tensão + progressão + modo. **Masterização** sorteia a prensagem: Demo 70% · Single 22% · Hit 7% · Classic 1% (Feel ajuda; chance à mostra).
- Songs lançadas (até 5 na Setlist) pagam **royalties** por hora, também offline.
- **Charts:** a força da Setlist te põe numa posição contra uma escada de músicas rivais; marcos (Top 100 · 50 · 20 · 10 · 1) pagam Gold Records.

## 🧭 Camadas (começar simples)

Lição do Distillery (27/09: *"tá muito complexo, não tá divertido… tem que começar bem mais simples"*): uma coisa por vez, só quando dá pra usar. Lugar trancado aparece tracejado com o que falta.

| Quando | Abre |
|---|---|
| 0 s | o loop (I–IV–V–I), violão, notas, campo harmônico com I/IV/V |
| 1º $25 | Band (bateria) |
| 5 fãs | Gigs: Coffee House |
| 25 fãs | Keys: círculo das quintas |
| 40 fãs | Sevenths, Jazz Cellar |
| 1º caixote | Workbench |
| Lead comprado | Jam |
| 150 fãs | Borrowed |
| 250 fãs + 2 tons | Modes |
| 400 fãs | Applied |
| 600 fãs | Studio, Recording Studio |
| 800 fãs | Loop de 8 compassos |
| 1.000 fãs | Color |
| 1.500 fãs | Summer Festival |

## 🔊 Som (tão importante quanto a conta)

- Tudo sintetizado em WebAudio (sem arquivo; o som real vem depois).
- **Violão:** Karplus-Strong com afinação fracionária. **Piano elétrico:** FM (2 operadores) com tine. **Baixo:** seno + triângulo com filtro que fecha. **Bateria:** bumbo com queda de frequência, caixa de ruído + tom, chimbal de ruído agudo, pratos de quadradas metálicas, conga e shaker com **ritmos euclidianos** (Toussaint). **Flauta:** onda periódica com sopro e vibrato que entra devagar. **Cordas:** serras desafinadas com ataque lento. **Coro** (Transcendent): serras em filtros de formante "aah".
- **Arranjo pela raridade** (tabela da banda). **Arranjo pela grade:** Sweet = virada do solo · Soaring = segunda voz em terça + brilho · Transcendent = banda inteira, coro, prato e luz.
- **Mixagem:** barramento por instrumento (filtro, pan, envio de reverb por convolução), compressor no master, **sidechain** do pad no bumbo.
- **Sons de interface em tom:** comprar = arpejo do tom atual; falhar = cluster de 2ª menor; descobrir = escala do modo; sucesso de melhoria = V→I; falha = V→vi.

## 🎨 Visual (o protótipo aprovado)

Palco à noite (`--night #111230`), **Shrikhand** (título e acorde gigante), **Figtree** (texto), **DM Mono** (número). Cor de função: **tônica âmbar `#FFB23E`**, **subdominante verde-água `#38D1AE`**, **dominante coral `#FF6B5E`**; a luz do palco muda com a função. Raridade: Common `#BDBBDF` · Rare `#69A9FF` · Epic `#C38CFF` · Legendary `#F3E47E` (com brilho). Grade do compasso usa as mesmas 4 cores. Leis do Fortn/Distillery: toque ≥ 44 px, 225/195 ms, curva declarada, `prefers-reduced-motion`, número tabular, texto ≥ 12 px, sem texto de instrução (o (i) explica).

## 🗺️ Roadmap

| Etapa | O quê | Estado |
|---|---|---|
| 1 | Projeto (Vite + Preact + TS + vitest + single-file), GDD | feito |
| 2 | Motor de teoria + testes (grafia, modos, acordes, função, tensão, fluxo, condução de vozes) | feito |
| 3 | Regra do jogo: compasso, harmonia, tensão/soltura, grade com pity, notas, banda, tons, modos, vocabulário, Songbook, offline | feito |
| 4 | Motor de som: sequenciador por compasso, 7 instrumentos, arranjo por raridade e grade, mixagem | feito |
| 5 | Telas: Stage, Band, Gigs, Theory, Studio, folhas, (i), suco | feito |
| 6 | Gigs ao vivo com Monte Carlo, caixotes carta a carta, equipamento, Workbench | feito |
| 7 | Jam, Studio (Songs, royalties, Charts), boosts com Gold Records | feito |
| 8 | Simulador de economia por perfil e balanceamento | feito |
| 9 | Mãozinha dos primeiros passos (feita); tarefas do dia, login, temporada | próximo |
| 10 | Android (Capacitor), conta na nuvem, som gravado | depois |

## 📈 Ritmo medido no simulador (01/10)

`npm run sim -- economia` (robô com as regras de verdade, 30 dias, 2 sementes, mediana). O robô otimiza o loop por gorjeta (subida de coordenada), aprende o acorde mais barato, contrata, afina o mais barato, compra tom e modo quando sobra, sobe o local mais difícil onde ganha o próximo nível com ≥ 50% e melhora o equipamento vestido.

A 1ª versão terminava o jogo inteiro no dia 1 (até pra quem joga 20 min): notas e fãs caíam × músicos, o offline de 3 × 4 h por dia rendia ~13 mil compassos e os custos não acompanhavam a multiplicação da renda. Mudou: nota e fã por compasso sem × músicos; nota offline a 50% da eficiência; raridade 400 · 5.000 · 60.000 notas; afinar ×1,6 por nível e ×40 por raridade; instrumentos $25 · $400 · $8K · $150K · $2,5M; tons de $1K a $5B; BPM até $400M; loop de 8 $2,5M; gig com fã [0,6 · 0,35 · 0,15] × L^1,2, caixote por chance (35/15/5%), régua ×2 por nível e Gold Record de 1ª vitória = ⌈L/2⌉.

| Marco | 20 min/dia | 1 h/dia (60%) | 2 h/dia | 4 h/dia |
|---|---|---|---|---|
| Bateria, baixo, vi/ii/iii, Sevenths | 1ª sessão | 1ª sessão | 1ª sessão | 1ª sessão |
| 2º tom | dia 1 | 1ª sessão | 1ª sessão | 1ª sessão |
| Piano elétrico, Jazz Cellar | dia 1 | dia 1 | dia 1 | dia 1 |
| 1º Rare | dia 1 | dia 1 | dia 1 | dia 1 |
| Borrowed | dia 2 | dia 2 | dia 1 | dia 1 |
| 1º Epic | dia 3 | dia 2 | dia 1 | dia 1 |
| Applied | dia 5 | dia 3 | dia 3 | dia 2 |
| Studio (1ª música) | dia 7 | dia 4 | dia 3 | dia 2 |
| Loop de 8 | dia 9 | dia 6 | dia 4 | dia 3 |
| Color, 1.000 fãs | dia 10 | dia 7 | dia 5 | dia 3 |
| 1º Legendary | dia 11 | dia 8 | dia 5 | dia 6 |
| Summer Festival | dia 13 | dia 9 | dia 7 | dia 5 |
| 1ª ★ (Conservatory) | dia 16 | dia 11 | dia 7 | dia 7 |
| Modo Locrian | dia 21 | dia 15 | dia 10 | dia 7 |
| 10 tons | — | dia 22 | dia 16 | dia 30 |
| Equipamento +12 | dia 26 | dia 23 | dia 10 | dia 18 |
| 176 BPM | — | dia 24 | dia 18 | — |
| Festival nível 10 | — | — | dia 26 | — |

Renda ($/s, 1 h/dia): dia 1 249 · dia 2 668 · dia 7 3,7K · dia 14 14,8K · dia 30 28K. Algo novo em toda sessão da 1ª semana; a curva achata depois do dia 14 (wall suave), que é a regra herdada do Distillery (14 dias de progresso forte).

**Em aberto:** o robô só acha ~8 progressões (ele otimiza gorjeta, não coleção); gente acha mais. A renda do perfil de 2 h cai do dia 14 pro 30 (o robô troca de tom pra farmar nota e perde a otimização); investigar. Notas viram sobra depois do dia 9 (todos os acordes aprendidos): a próxima moeda de notas é Mastery de progressão e caixote.

## 🔊 Som medido (01/10)

Saída interceptada no Chromium: só o violão RMS 0,05 e pico 0,32; banda inteira Legendary RMS 0,14 e pico 0,73. Sem clipar, sem NaN, sem silêncio.

## 🔬 Pesquisa (01/10)

- **Transições de acorde:** cadeia de Markov do [Hooktheory](https://www.hooktheory.com/blog/chord-progression-search-patterns-and-trends/) (I → IV 46%, I → V 26%; IV → I → V em 41%); [Trends](https://www.hooktheory.com/blog/trends-tool/) com 40 mil músicas.
- **Consonância:** [Plomp & Levelt 1965](https://www.mpi.nl/world/materials/publications/levelt/Plomp_Levelt_Tonal_1965.pdf) (aspereza pela banda crítica; ordem 1:1, 1:2, 2:3, 3:5, 3:4, 5:6, 4:5).
- **Tensão tonal:** [Lerdahl, Tonal Pitch Space](https://academic.oup.com/book/32497); [modelo computacional de tensão](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7712964/).
- **Dopamina e música:** [Salimpoor et al. 2011](https://www.zlab.mcgill.ca/publications/docs/salimpoor_2011_nn.pdf) (caudado na antecipação, núcleo accumbens no pico); [ScienceDaily](https://www.sciencedaily.com/releases/2011/01/110112111117.htm). Base do medidor de tensão → soltura.
- **Condução de vozes:** [neo-riemanniana (PLR)](https://en.wikipedia.org/wiki/Neo-Riemannian_theory), parcimônia de vozes.
- **Ritmo:** [Toussaint, ritmos euclidianos](https://en.wikipedia.org/wiki/Euclidean_rhythm).
- **Modos por brilho:** [Open Music Theory](https://viva.pressbooks.pub/openmusictheory/chapter/intro-to-diatonic-modes-and-the-chromatic-scale/).
- **Acordes emprestados e dominantes secundárias:** [Open Music Theory, substituições](https://viva.pressbooks.pub/openmusictheory/chapter/substitutions/), [trítono](https://en.wikipedia.org/wiki/Tritone_substitution).
- **Pontuação que se vê:** [Balatro chips × mult](https://dood.gg/en/balatro/guides/scoring-guide/), [suco do Balatro](https://blakecrosley.com/guides/design/balatro).
- **Pity:** [soft e hard pity do Genshin](https://genshintactics.com/guides/genshin-pity-system-explained-2026/) (0,6% base, rampa do 74, garantia no 90, média ~62).
- **Idle:** [Math of Idle Games](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i) (custo × 1,07–1,15 por unidade), [parte III](https://blog.kongregate.com/the-math-of-idle-games-part-iii/amp/).
- **Loot com afixos:** [loot tables de ARPG](https://www.gamedeveloper.com/design/defining-loot-tables-in-arpg-game-design).
- **Ritmo e janelas de tempo:** [escala de julgamento](https://rhythm-games.com/guides/rhythm-game-scoring-system-explained) (Perfect ±16–33 ms no PC; no celular, abrimos as janelas pela latência de toque e áudio).
- **Flow:** [Csikszentmihalyi aplicado a jogos](https://www.gamedeveloper.com/design/the-flow-applied-to-game-design), [Jenova Chen](https://www.jenovachen.com/flowingames/Flow_in_games_final.pdf).
- **Recompensa variável e quase-acerto:** [razão variável](https://www.simplypsychology.org/schedules-of-reinforcement.html), [near-miss](https://link.springer.com/article/10.1007/s10899-019-09891-8). Aqui o quase-acerto **não** é fabricado.
- **Mercado:** [Beatstar](https://www.deconstructoroffun.com/blog/2021/9/12/beatstar) (US$100M+, mas caiu por pouca variedade de sistemas: o Tonic aposta em profundidade de sistema); idles de banda ([Idle Music Band](https://play.google.com/store/apps/details?id=idle.music.band), [Music Band Tycoon](https://apps.apple.com/us/app/music-band-tycoon-idle-games/id6443993567)) são gerente de banda sem teoria nenhuma.
- **Do Distillery:** pity à mostra (MWM), recompensa variável com teto (Bright Delights), failstack do Black Desert, power-up de runa do Summoners War, caixote carta a carta do Hearthstone, suspense antes da cor (Overwatch), "Juice it or lose it", liberar aos poucos (Udonis), Collection Log do OSRS.
