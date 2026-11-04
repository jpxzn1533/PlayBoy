-- CPF/CNPJ do cliente, exigido pelo gateway de pagamento (Iron Pay).
ALTER TABLE "User" ADD COLUMN "document" TEXT;
