export class VettingResultDto {
  applicationId!: string;
  checks!: VerificationCheckResponseDto[];
  overallRisk!: string;
}

export class VerificationCheckResponseDto {
  id!: string;
  checkType!: string;
  result?: any;
  status!: string;
  checkedBy?: string;
  checkedAt?: Date;
  createdAt!: Date;
}