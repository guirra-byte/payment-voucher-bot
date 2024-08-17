class Payment {
  billingPeriod;
  payment;
  paymentOwner;

  /**
   * Cria uma instância de Pagamento.
   * @param {string} payerName - Nome do pagador.
   * @param {string} billingPeriod - O período do pagamento no formato "fev/2024".
   * * Objeto que representa os detalhes de um pagamento.
   * @type {Object} payment
   * @property {string} status - Status de pagamento (PAID, PARTIAL or UNPAID).
   * @property {number} amount - O valor do pagamento.
   * @property {number} credits - Valor para ser abatido na próxima mensalidade.
   * @property {string} stage - Em que estágio do programa a turma se encontra, 
   * para definir quanto se deve cobrar na mensalidade.
   */

  constructor(paymentOwner, billingPeriod, payment) {
    this.billingPeriod = billingPeriod;
    this.payment = payment;
    this.paymentOwner = paymentOwner;
  }

  credits() {
    return this.payment.credits;
  }

  status() {
    return this.payment.status;
  }
}

module.exports = Payment;
