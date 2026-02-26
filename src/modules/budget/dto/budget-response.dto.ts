export type BudgetResponseDto = {
  id: string;
  year: number;
  totalAmount: number;
  remainingAmount: number;
  reservedAmount: number;
  availableAmount: number;
  createdAt: Date;
  updatedAt: Date;
};
