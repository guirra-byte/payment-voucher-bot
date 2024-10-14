## Caso de Uso
**`Status do projeto`**: **Em Desenvolvimento** 🚧 <br>
Este projeto foi criado para automatizar o **processo de cobrança e verificação de pagamentos de mensalidades através de um chatbot no WhatsApp**. Antes, a cobrança era realizada por meio de listas de transmissão, e os comprovantes de pagamento eram verificados manualmente, um por um. O sistema desenvolvido simplifica e automatiza essa tarefa, permitindo a automatização na verificação dos comprovantes de pagamento dos alunos, garantindo mais eficiência na gestão de pagamentos e controle de mensalidades.

## Descrição
Este bot facilita o **`controle e a gestão de pagamentos de mensalidade através do WhatsApp`**.

![image (10)](https://github.com/user-attachments/assets/3cca2c7d-0028-460e-b81b-419f1f8dea88)

## Features:
### Upload de Comprovantes: 
Usuários enviam comprovantes de pagamento diretamente pelo WhatsApp.
### Verificação Automatizada: 
O bot analisa os comprovantes e confirma se o pagamento foi realizado corretamente.
### Notificações: 
Envia confirmações de pagamento e lembretes para os usuários sobre pendências de mensalidades.
## 
![image (11)](https://github.com/user-attachments/assets/0ad32aee-da29-4dc5-ba1d-0711cc5a6b38)

## Tecnologias Utilizadas:

**`Node.js:`** Base do servidor, utilizado para construir a lógica do bot. <br>
**`whatsapp-web.js:`** Biblioteca para realizar a integração com o WhatsApp, permitindo a interação com os usuários. <br>
**`Tesseract.js:`** Biblioteca utilizada para realizar a extração das informações **(OCR)** dos comprovantes enviados pelos usuários. <br>
**`Prisma:`** ORM utilizado para gerenciar e acessar o banco de dados, armazenando informações sobre os pagamentos. <br>
**`JavaScript:`** Linguagem utilizada para desenvolver o bot.

<br>

> [!NOTE]
> Uma futura feature do sistema será a **integração direta com a API de um banco**,
> permitindo a **geração automática de chaves e QR Codes para pagamento via Pix**.
> Além disso, o sistema receberá **confirmações de pagamento em tempo real através de webhooks**,
> otimizando ainda mais o processo de cobrança e recebimento.
