import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Grid,
  Button,
  Box,
  Paper,
  Fade,
  Alert,
} from '@mui/material';
import {
  ArrowForward as ArrowForwardIcon,
  ShoppingBag as ShoppingBagIcon,
  Star as StarIcon,
  LocalShipping as ShippingIcon,
  Security as SecurityIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { productService } from '../../services/productService';
import { Product } from '../../types';
import { useCart } from '../../contexts/CartContext';
import ProductCard from '../../components/common/ProductCard';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';

const Home: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addItem } = useCart();

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const featuredProducts = await productService.getAll();
        setProducts(featuredProducts.slice(0, 8));
      } catch (err) {
        setError('Unable to load products. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 8 }}>
          <LoadingSkeleton count={8} />
        </Box>
      </Container>
    );
  }

  return (
    <>
      {/* Hero Section */}
      <Box
        sx={{
          backgroundImage: 'linear-gradient(90deg, rgba(0,0,0,0.78), rgba(0,0,0,0.34)), url(https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1800&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: 'white',
          minHeight: { xs: 560, md: 640 },
          py: { xs: 8, md: 12 },
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid size={{ xs: 12, md: 7 }}>
              <Fade in timeout={1000}>
                <Box>
                  <Typography
                    variant="h1"
                    component="h1"
                    sx={{
                      fontWeight: 700,
                      mb: 3,
                      fontSize: { xs: '2.5rem', md: '3.5rem' },
                      color: 'white',
                      maxWidth: 720,
                    }}
                  >
                    Boutique App
                    <Box component="span" sx={{ color: '#d4af37' }}>
                      {' '}Curated Luxury
                    </Box>
                  </Typography>
                  <Typography
                    variant="h5"
                    component="p"
                    sx={{
                      mb: 4,
                      lineHeight: 1.6,
                      fontWeight: 300,
                      opacity: 0.9,
                      maxWidth: 620,
                      color: 'rgba(255,255,255,0.9)',
                    }}
                  >
                    Shop a refined edit of apparel, accessories, shoes, jewelry, and bags selected for modern everyday elegance.
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button
                      variant="contained"
                      size="large"
                      endIcon={<ShoppingBagIcon />}
                      href="/products"
                      sx={{
                        backgroundColor: '#d4af37',
                        color: '#1a1a1a',
                        px: 4,
                        py: 1.5,
                        '&:hover': {
                          backgroundColor: '#b8941f',
                        },
                      }}
                    >
                      Shop Collection
                    </Button>
                    <Button
                      variant="outlined"
                      size="large"
                      endIcon={<ArrowForwardIcon />}
                      href="#featured"
                      sx={{
                        borderColor: 'white',
                        color: 'white',
                        px: 4,
                        py: 1.5,
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          borderColor: 'white',
                        },
                      }}
                    >
                      Explore More
                    </Button>
                  </Box>
                </Box>
              </Fade>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg">
        <Box sx={{ py: 8 }}>
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Paper
                elevation={2}
                sx={{
                  p: 3,
                  textAlign: 'center',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <ShippingIcon sx={{ fontSize: 48, color: '#d4af37', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Free Shipping
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  On orders over $500
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Paper
                elevation={2}
                sx={{
                  p: 3,
                  textAlign: 'center',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <SecurityIcon sx={{ fontSize: 48, color: '#d4af37', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Secure Payment
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  100% secure transactions
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Paper
                elevation={2}
                sx={{
                  p: 3,
                  textAlign: 'center',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <StarIcon sx={{ fontSize: 48, color: '#d4af37', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Premium Quality
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Carefully selected products
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Paper
                elevation={2}
                sx={{
                  p: 3,
                  textAlign: 'center',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <RefreshIcon sx={{ fontSize: 48, color: '#d4af37', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Easy Returns
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  30-day return policy
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Container>

      {/* Shop by Category */}
      <Container maxWidth="lg">
        <Box sx={{ py: 8 }}>
          <Box sx={{ textAlign: 'center', mb: 5 }}>
            <Typography variant="h4" component="h2" sx={{ fontFamily: '"Playfair Display", serif', mb: 1 }}>
              Shop by Category
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Find your style across our curated collections
            </Typography>
          </Box>
          <Grid container spacing={2}>
            {[
              { label: 'Women', image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=80' },
              { label: 'Men', image: 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?auto=format&fit=crop&w=600&q=80' },
              { label: 'Bags', image: 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=600&q=80' },
              { label: 'Shoes', image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=600&q=80' },
              { label: 'Jewelry', image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=600&q=80' },
              { label: 'Accessories', image: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?auto=format&fit=crop&w=600&q=80' },
            ].map((cat) => (
              <Grid size={{ xs: 6, sm: 4, md: 2 }} key={cat.label}>
                <Box
                  component="a"
                  href={`/products?category=${cat.label}`}
                  sx={{
                    display: 'block',
                    textDecoration: 'none',
                    borderRadius: 2,
                    overflow: 'hidden',
                    position: 'relative',
                    aspectRatio: '3/4',
                    '&:hover img': { transform: 'scale(1.06)' },
                    '&:hover .cat-label': { backgroundColor: 'rgba(212,175,55,0.9)' },
                  }}
                >
                  <Box
                    component="img"
                    src={cat.image}
                    alt={cat.label}
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                      transition: 'transform 0.4s ease',
                    }}
                  />
                  <Box
                    className="cat-label"
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      backgroundColor: 'rgba(26,26,26,0.72)',
                      color: 'white',
                      textAlign: 'center',
                      py: 1.2,
                      transition: 'background-color 0.3s ease',
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, fontSize: '0.75rem' }}>
                      {cat.label}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>

      {/* Featured Products Section */}
      <Box sx={{ backgroundColor: '#f8f8f8', py: 8 }} id="featured">
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography
              variant="h4"
              component="h2"
              gutterBottom
              sx={{ fontFamily: '"Playfair Display", serif' }}
            >
              Featured Products
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
              Discover our handpicked selection of luxury items
            </Typography>
          </Box>
          
          {error ? (
            <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>
          ) : (
            <Grid container spacing={4}>
              {products.map((product) => (
                <Grid size={{ xs: 12, sm: 6, md: 3 }} key={product.id}>
                  <ProductCard
                    product={product}
                    onAddToCart={addItem}
                  />
                </Grid>
              ))}
            </Grid>
          )}

          <Box sx={{ textAlign: 'center', mt: 6 }}>
            <Button
              variant="outlined"
              size="large"
              href="/products"
              endIcon={<ArrowForwardIcon />}
              sx={{
                px: 4,
                py: 1.5,
              }}
            >
              View All Products
            </Button>
          </Box>
        </Container>
      </Box>
    </>
  );
};

export default Home;
