# Takeat Entregas – modo celular

Script que deixa a tela de **Delivery** do painel Takeat (`dashboard.takeat.app/delivery/orders`)
fácil de usar no celular. Ele roda só no **seu** navegador: nada muda no sistema do Takeat,
nos pedidos nem para outras pessoas.

## O que muda

- **Uma coluna por vez, em tela cheia.** No topo fica uma barra fixa com as colunas
  (Andamento, Pronto, Em rota, Entregue) e quantos pedidos tem em cada uma. Toque para trocar.
  A coluna escolhida fica salva.
- **Some o que atrapalha no celular:** menu lateral (abre no botão ☰), barra de cima,
  links de delivery, Plantão/Tutorial, busca e o balão de chat.
- **Em cada pedido aparece uma caixa com:**
  - 📍 endereço e ponto de referência
  - quanto cobrar: **JÁ PAGO** (verde) ou **COBRAR R$ X** (amarelo). Em dinheiro, mostra o
    troco (ex.: *cliente paga com R$ 50,00 → levar R$ 15,00 de troco*). No cartão, lembra
    de levar a maquininha
  - botões grandes: **Maps**, **Waze**, **Ligar** e **WhatsApp**
- **Botões do pedido grandes** (avançar ➜, ver 👁, editar ✏).
- **Só meus:** esconde os pedidos que estão com outros motoboys. Na primeira vez ele
  pergunta o seu nome (do jeito que aparece em "Motoboy:" no pedido).
- **⟳** atualiza os pedidos. **🖥** volta para a tela original. Para religar, toque em
  **📱 Modo celular**.
- No computador (tela com mais de 1000px de largura) nada muda.

## Como instalar

Use o mesmo link nas opções 1 e 2:

```
https://raw.githubusercontent.com/KauanBuffon7/SITE-DE-PUBLICACAO-DE-ROMANEIO-JS-MAIS-SCRIPT-DE-UPLOAD/main/takeat-mobile/takeat-mobile.user.js
```

### 1. Android (recomendado): Firefox + Tampermonkey

1. Instale o **Firefox** pela Play Store.
2. No Firefox: menu **⋮** → **Extensões** → procure **Tampermonkey** → **+** → **Adicionar**.
3. Ainda no Firefox, abra o link acima. O Tampermonkey mostra a tela do script: toque em **Instalar**.
4. Abra `https://dashboard.takeat.app/delivery/orders` no Firefox e faça login. Pronto.

O Tampermonkey procura atualizações do script sozinho.

### 2. iPhone: Safari + Userscripts

1. Instale o app **Userscripts** (grátis, na App Store).
2. **Ajustes → Apps → Safari → Extensões → Userscripts**: ative e permita em
   `dashboard.takeat.app`.
3. No Safari, abra o link acima, toque no botão de extensões (ícone **AA** ou 🧩) →
   **Userscripts** → **Instalar**.
4. Abra o painel do Takeat no Safari.

### 3. Sem instalar nada (Chrome): favorito com o script

Funciona no Chrome, mas precisa ser ativado **toda vez que a página recarregar**.

1. No Chrome, salve qualquer página nos favoritos (☆) e depois **edite** esse favorito:
   - Nome: `Entregas`
   - URL: apague tudo e cole o código abaixo
2. Abra o painel do Takeat, toque na barra de endereço, digite `Entregas` e toque no
   favorito que aparece na lista.

```
javascript:(function(){var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/gh/KauanBuffon7/SITE-DE-PUBLICACAO-DE-ROMANEIO-JS-MAIS-SCRIPT-DE-UPLOAD@main/takeat-mobile/takeat-mobile.user.js';document.body.appendChild(s);})();
```

Se nada acontecer, é porque o site bloqueou o script. Nesse caso, use a opção 1.

## Se algo ficar estranho

Toque no **🖥** na barra de cima para voltar à tela original na hora. Se o Takeat mudar o
layout do painel, algumas partes do script podem parar de funcionar. A tela original
continua funcionando normalmente.

## Como funciona (para quem for mexer no código)

- `takeat-mobile.user.js` é um userscript comum (`@run-at document-start`, `@grant none`).
- Só liga em `/delivery/...` e com a tela de até 1000px de largura. Todo o CSS fica
  dentro de `html.tkm-on`, então desligado não muda nada.
- Os elementos são achados pelo texto e pela estrutura, não só pelos nomes de classe
  do styled-components, que mudam a cada versão do Takeat. Um `MutationObserver` marca os
  elementos de novo sempre que o React redesenha a página.
- As listas de pedidos usam `react-virtualized`, com cartões de altura fixa e posição
  absoluta. No celular os cartões voltam para o fluxo normal (altura automática) e a página
  inteira rola. A coluna escondida fica com altura zero e não usa `display:none` nem
  `visibility:hidden`, porque os ícones SVG de colunas diferentes usam máscaras com o mesmo `id`.
- Endereço, pagamento, total e troco vêm do comprovante de impressão que o Takeat já
  coloca escondido em cada pedido (`DisplayNoneImprimir`).
- As preferências ficam no `localStorage` do próprio site (`tkm:v1`).
