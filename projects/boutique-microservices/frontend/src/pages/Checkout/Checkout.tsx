import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Grid,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  Lock as LockIcon,
  LocalShipping as ShippingIcon,
  ShoppingBag as ShoppingBagIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { orderService } from '../../services/orderService';
import { Address } from '../../types';

const initialAddress: Address = {
  street: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'United States',
};

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, total, clearCart } = useCart();
  const [shippingAddress, setShippingAddress] = useState<Address>(initialAddress);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successOpen, setSuccessOpen] = useState(false);

  const shipping = total > 500 ? 0 : 15;
  const tax = total * 0.08;
  const finalTotal = total + shipping + tax;

  const updateAddress = (field: keyof Address, value: string) => {
    setShippingAddress((current) => ({ ...current, [field]: value }));
  };

  const canSubmit = Object.values(shippingAddress).every(Boolean) && items.length > 0 && !submitting;

  const placeOrder = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!canSubmit) {
      setError('Please complete your shipping details before placing the order.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await orderService.createOrder({
        items: items.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
        shippingAddress,
      });
      clearCart();
      setSuccessOpen(true);
      setTimeout(() => navigate('/orders'), 900);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not place your order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <Container maxWidth="md">
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <ShoppingBagIcon sx={{ fontSize: 72, color: 'secondary.main', mb: 2 }} />
          <Typography variant="h3" component="h1" gutterBottom>
            Your bag is ready for a new find
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            Add a few pieces before starting checkout.
          </Typography>
          <Button variant="contained" onClick={() => navigate('/products')}>
            Shop Products
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: { xs: 3, md: 5 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 4 }}>
          <Box>
            <Typography variant="h3" component="h1" gutterBottom>
              Checkout
            </Typography>
            <Typography color="text.secondary">
              Review your order and confirm where we should send it.
            </Typography>
          </Box>
          <Chip icon={<LockIcon />} label="Secure checkout" variant="outlined" sx={{ alignSelf: 'flex-start' }} />
        </Stack>

        {!user && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Sign in or create an account before placing your order.
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper elevation={2} sx={{ p: { xs: 2.5, md: 4 } }}>
              <Typography variant="h5" gutterBottom>
                Shipping Details
              </Typography>
              <Grid container spacing={2.5} sx={{ mt: 1 }}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Street address"
                    value={shippingAddress.street}
                    onChange={(event) => updateAddress('street', event.target.value)}
                    fullWidth
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="City"
                    value={shippingAddress.city}
                    onChange={(event) => updateAddress('city', event.target.value)}
                    fullWidth
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <TextField
                    label="State"
                    value={shippingAddress.state}
                    onChange={(event) => updateAddress('state', event.target.value)}
                    fullWidth
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <TextField
                    label="ZIP"
                    value={shippingAddress.zipCode}
                    onChange={(event) => updateAddress('zipCode', event.target.value)}
                    fullWidth
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Country"
                    value={shippingAddress.country}
                    onChange={(event) => updateAddress('country', event.target.value)}
                    fullWidth
                    required
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Paper elevation={2} sx={{ p: { xs: 2.5, md: 4 }, position: 'sticky', top: 24 }}>
              <Typography variant="h5" gutterBottom>
                Order Summary
              </Typography>
              <Stack spacing={2.5} sx={{ my: 3 }}>
                {items.map((item) => (
                  <Box key={item.id} sx={{ display: 'flex', gap: 2 }}>
                    <Box
                      component="img"
                      src={item.imageUrl}
                      alt={item.name}
                      sx={{ width: 72, height: 88, objectFit: 'cover', borderRadius: 1 }}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" noWrap>
                        {item.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Qty {item.quantity}
                      </Typography>
                    </Box>
                    <Typography variant="subtitle1">
                      ${((typeof item.price === 'string' ? parseFloat(item.price) : item.price) * item.quantity).toFixed(2)}
                    </Typography>
                  </Box>
                ))}
              </Stack>

              <Divider sx={{ my: 2 }} />
              <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Subtotal</Typography>
                  <Typography>${total.toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <ShippingIcon fontSize="small" />
                    <Typography>Shipping</Typography>
                  </Stack>
                  <Typography>{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Estimated tax</Typography>
                  <Typography>${tax.toFixed(2)}</Typography>
                </Box>
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6">Total</Typography>
                <Typography variant="h6" color="secondary.dark">
                  ${finalTotal.toFixed(2)}
                </Typography>
              </Box>
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={placeOrder}
                disabled={!canSubmit || !user}
              >
                {user ? (submitting ? 'Placing Order...' : 'Place Order') : 'Sign In to Continue'}
              </Button>
            </Paper>
          </Grid>
        </Grid>

        <Snackbar open={successOpen} autoHideDuration={2000} onClose={() => setSuccessOpen(false)}>
          <Alert severity="success">Order placed successfully.</Alert>
        </Snackbar>
      </Box>
    </Container>
  );
};

export default Checkout;
