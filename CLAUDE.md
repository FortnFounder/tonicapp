# CLAUDE.md

Guia do Claude Code neste repo. **Tonic**: jogo idle de banda baseado em teoria musical, pra Play Store. O design inteiro mora em [`GDD.md`](GDD.md); leia antes de qualquer coisa de substância. O repo irmão `distilleryidle` é a referência de método (simulador, regras da casa, suco).

## O que este repo é

- Hobby do Fellipe, como o Distillery. Nada de grana, família ou saúde dele entra aqui: o jogo é pro mundo.
- `prototype/tonic.html` é o protótipo de uma página que deu origem ao jogo (o visual foi aprovado). Não é mais o jogo; fica como referência.

## Código

- `npm run dev` roda local · `npm test` roda a lógica (vitest) · `npm run build:artifact` gera `dist/artifact.html` pra publicar como link · `npm run sim -- economia` faz o robô jogar 30 dias por perfil e mostra quando cada marco acontece. Mexeu em número de balanceamento, roda o simulador.
- **Texto do jogo em inglês.** Comentário de código, commit e GDD em português. Sem sigla na tela e sem frase que ensina (a explicação mora no (i)).
- **Teoria musical pura** em `src/theory.ts` (nota, grafia, modo, acorde, função, tensão, fluxo, condução de vozes). Nada de tabela mágica: se a regra existe em teoria, ela é calculada.
- **Regra do jogo pura** em `src/game.ts` (estado, relógio e sorteio entram por parâmetro), loop e harmonia em `src/harmony.ts`, gigs em `src/gig.ts`, equipamento e caixotes em `src/gear.ts`, Jam em `src/jam.ts`, Songs e Charts em `src/studio.ts`, lugares que abrem em `src/unlock.ts`. **Todo número de balanceamento** em `src/content.ts`.
- **Som** em `src/audio/`: `engine.ts` (contexto, barramentos, reverb, compressor), `instruments.ts` (sínteses), `arranger.ts` (o que cada instrumento toca no compasso, pela raridade e pela grade), `sequencer.ts` (relógio que agenda o compasso e chama o jogo). O compasso é sorteado na hora de agendar, então o som já sabe a grade.
- Tela em Preact: `src/main.tsx` + `src/ui/`. Estado global em `src/store.ts` (`act` muda e salva, `mutate` muda sem salvar). Efeitos em `src/fx.ts`.

## Como falar com o Fellipe

- **PT-BR, direto, seco, curto.** Ele lê no celular. Sem elogio de sanduíche. Ruim é ruim, com o motivo.
- **Uma recomendação, não um cardápio.**
- **Pergunta só quando a resposta muda o que você faz.** Senão assume e avisa o que assumiu.
- **Nunca invente número** de retenção, receita ou mercado.
- **Entrega visual vira link** (Artifact): ele está no celular.

## Design: as regras que não se negociam

- **O filtro:** toda mecânica deixa o loop **mais rico, mais rápido ou mais sortudo**. Não mexe em nenhum, não entra.
- **Chance sempre à mostra** antes da decisão (odds do compasso, Monte Carlo do gig, tabela do caixote, chance da melhoria). Sem quase-acerto fabricado: o ponteiro para onde o número caiu.
- **Caixote nunca por dinheiro real**, moeda do jogo nunca à venda.
- **Preço fechado:** escada 1 · 1,5 · 2 · 2,5 · 3 · 4 · 5 · 6 · 7,5 × 10ⁿ (`roundPrice`).
- **Começar simples:** cada lugar abre quando dá pra usar (`src/unlock.ts`); nada abre tudo de uma vez.
- **O som ensina a regra:** toda conta que o jogo faz tem que ser audível (tensão acumulando, soltura na tônica, grade rara com a banda crescendo, sucesso = cadência perfeita, falha = deceptiva).
- **Nenhum número do GDD é final.** É balanceamento; o simulador mede.

## Trabalho visual

- Pesquisa de campo antes de codar e fonte citada (regra do Fellipe).
- **Construiu tela? Abre e OLHA:** build → Playwright em 390×844, deviceScaleFactor 2 → ler o screenshot.
- Leis: toque ≥ 44 px, entra 225 ms / sai 195 ms, curva declarada, `prefers-reduced-motion`, número tabular, texto ≥ 12 px.

## Git

- Commit em português, no imperativo: `adiciona medidor de tensão`, `ajusta chance do Soaring`.
- **Sessão que decidiu algo e não atualizou o `GDD.md` não aconteceu.**
