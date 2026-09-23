import type { Request, Response } from 'express';
import { reportService } from './report.service.js';
import type { CreateReportInput } from './report.validation.js';

export const createReportHandler = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const body = req.body as CreateReportInput;

  const result = await reportService.createReport(body, userId);

  res.status(201).json({
    success: true,
    message: 'Report submitted successfully. For any issue or inquiries, contact sreephaneesha2005@gmail.com',
    data: {
      report: result,
      contactEmail: 'sreephaneesha2005@gmail.com',
    },
  });
};
