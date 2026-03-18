/**
 * Tests pour le service de paiement
 */

import { paymentService } from '@/services/payment.service';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(),
    })),
    functions: {
      invoke: jest.fn(),
    },
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('paymentService', () => {
  describe('createPaymentIntent', () => {
    it('calls create-payment-intent edge function with correct params', async () => {
      const mockResponse = {
        data: {
          clientSecret: 'sk_test_123',
          paymentIntentId: 'pi_123',
          paymentId: 'p_123',
        },
        error: null,
      };

      (supabase.functions.invoke as jest.Mock).mockResolvedValue(mockResponse);

      const result = await paymentService.createPaymentIntent('b1', 5000, 's1');

      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'create-payment-intent',
        expect.objectContaining({
          body: {
            bookingId: 'b1',
            salonId: 's1',
            amount: 5000,
            paymentType: 'deposit',
            currency: 'eur',
          },
        })
      );
      expect(result.clientSecret).toBe('sk_test_123');
    });

    it('throws error when edge function returns error', async () => {
      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Function error' },
      });

      await expect(
        paymentService.createPaymentIntent('b1', 5000, 's1')
      ).rejects.toThrow('Function error');
    });
  });

  describe('getSalonPayments', () => {
    it('fetches salon payments with pagination', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [{ id: 'p1' }, { id: 'p2' }],
          error: null,
          count: 2,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await paymentService.getSalonPayments('s1', 1, 20);
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe('getSalonBalance', () => {
    it('sums unpaid completed payments', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      mockChain.eq
        .mockReturnValueOnce(mockChain)
        .mockReturnValueOnce(mockChain)
        .mockResolvedValueOnce({
          data: [{ salon_amount: 800 }, { salon_amount: 1200 }],
          error: null,
        });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await paymentService.getSalonBalance('s1');
      expect(result).toBe(2000);
    });
  });

  describe('getPaymentStatus', () => {
    it('fetches payment status for a booking', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { status: 'completed', amount: 5000 },
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await paymentService.getPaymentStatus('b1');
      expect(result?.status).toBe('completed');
    });
  });
});
