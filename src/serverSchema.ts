import {z} from 'zod';

export const workerMessageSchema = z.object({
    requestType : z.enum(['HTTP']),
    requestHeaders: z.any(),
    body: z.any(),
    url: z.string()
})

export const workerMessageResponseSchema = z.object({
    data: z.string().optional(),
    error: z.string().optional(),
    errorCode: z.enum(['500','400']).optional()
})
export type workerMessageResponseType = z.infer<typeof workerMessageResponseSchema>;
export type workerMessageType = z.infer<typeof workerMessageSchema>;