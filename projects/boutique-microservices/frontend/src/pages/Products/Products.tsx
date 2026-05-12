import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Grid,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Chip,
  Drawer,
  useMediaQuery,
  IconButton,
  Fab,
  Paper,
  Stack,
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Close as CloseIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  LocalShipping as ShippingIcon,
  WorkspacePremium as PremiumIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { productService } from '../../services/productService';
import { Product } from '../../types';
import { useCart } from '../../contexts/CartContext';
import ProductCard from '../../components/common/ProductCard';
import SearchBar from '../../components/common/SearchBar';
import FilterPanel from '../../components/common/FilterPanel';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';

const Products: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const { addItem } = useCart();

  const categories = Array.from(
    new Set(products.map(product => product.category).filter(Boolean))
  ).sort();

  const brands = Array.from(
    new Set(products.map(product => product.brand).filter(Boolean) as string[])
  ).sort();

  const sizes = [
    'XS', 'S', 'M', 'L', 'XL', 'XXL',
    '36', '37', '38', '39', '40', '41', '42', '43', '44', '45',
    'One Size',
  ];

  const colors = [
    'Black', 'White', 'Beige', 'Brown', 'Gray', 'Navy',
    'Red', 'Blue', 'Green', 'Pink', 'Gold', 'Silver',
  ];

  useEffect(() => {
    const loadProducts = async () => {
      console.log('[Products] Starting to load products...');
      try {
        const allProducts = await productService.getAll();
        setProducts(allProducts);
        setFilteredProducts(allProducts);
      } catch (error) {
        console.error('[Products] Error loading products:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  useEffect(() => {
    let filtered = products;

    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.category || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'newest':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        default:
          return 0;
      }
    });

    setFilteredProducts(filtered);
  }, [products, searchQuery, sortBy]);

  const handleFilterChange = (filters: any) => {
    let filtered = products;

    // Apply filters
    if (filters.priceRange) {
      filtered = filtered.filter(product => 
        product.price >= filters.priceRange[0] && product.price <= filters.priceRange[1]
      );
    }

    if (filters.category) {
      filtered = filtered.filter(product => product.category === filters.category);
    }

    if (filters.brand && filters.brand.length > 0) {
      filtered = filtered.filter(product => 
        product.brand && filters.brand.includes(product.brand)
      );
    }

    if (filters.inStock) {
      filtered = filtered.filter(product => product.inventory > 0);
    }

    // Apply search query
    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.category || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'newest':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        default:
          return 0;
      }
    });

    setFilteredProducts(filtered);
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <LoadingSkeleton count={12} />
        </Box>
      </Container>
    );
  }

  const maxPrice = Math.max(...products.map(p => p.price), 1000);
  const inStockCount = products.filter(product => product.inventory > 0).length;

  const mainContent = (
    <Box sx={{ flexGrow: 1 }}>
      <Paper
        elevation={0}
        sx={{
          mb: 4,
          p: { xs: 3, md: 4 },
          borderRadius: 2,
          color: 'white',
          backgroundImage: 'linear-gradient(90deg, rgba(0,0,0,0.82), rgba(0,0,0,0.35)), url(https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1600&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          minHeight: 240,
          display: 'flex',
          alignItems: 'flex-end',
        }}
      >
        <Box>
          <Typography variant="h3" component="h1" gutterBottom sx={{ color: 'white' }}>
            Boutique Collection
          </Typography>
          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.86)', maxWidth: 660 }}>
            A curated edit of refined essentials, statement accessories, and polished wardrobe pieces.
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 3, flexWrap: 'wrap', gap: 1 }}>
            <Chip icon={<PremiumIcon />} label={`${products.length} curated pieces`} sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.55)' }} variant="outlined" />
            <Chip icon={<ShippingIcon />} label={`${inStockCount} ready to ship`} sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.55)' }} variant="outlined" />
          </Stack>
        </Box>
      </Paper>

      <Box sx={{ mb: 3 }}>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Chip
            label="All"
            clickable
            color="primary"
            variant="outlined"
            onClick={() => setFilteredProducts(products)}
          />
          {categories.slice(0, 8).map(category => (
            <Chip
              key={category}
              label={category}
              clickable
              variant="outlined"
              onClick={() => setFilteredProducts(products.filter(product => product.category === category))}
            />
          ))}
        </Stack>
      </Box>

      {/* Search and Controls */}
      <Box sx={{ mb: 4, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Box sx={{ flexGrow: 1, minWidth: 300 }}>
          <SearchBar
            onSearch={setSearchQuery}
            placeholder="Search luxury products..."
          />
        </Box>
        
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Sort By</InputLabel>
          <Select
            value={sortBy}
            label="Sort By"
            onChange={(e) => setSortBy(e.target.value)}
          >
            <MenuItem value="featured">Featured</MenuItem>
            <MenuItem value="price-low">Price: Low to High</MenuItem>
            <MenuItem value="price-high">Price: High to Low</MenuItem>
            <MenuItem value="name">Name: A-Z</MenuItem>
            <MenuItem value="newest">Newest First</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton
            onClick={() => setViewMode('grid')}
            color={viewMode === 'grid' ? 'primary' : 'default'}
          >
            <ViewModuleIcon />
          </IconButton>
          <IconButton
            onClick={() => setViewMode('list')}
            color={viewMode === 'list' ? 'primary' : 'default'}
          >
            <ViewListIcon />
          </IconButton>
        </Box>

        {!isMobile && (
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={() => setFilterDrawerOpen(true)}
          >
            Filters
          </Button>
        )}
      </Box>

      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
        Showing {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
      </Typography>

      {/* Products Grid */}
      <Grid container spacing={viewMode === 'list' ? 2 : 4}>
        {filteredProducts.map((product) => (
          <Grid 
            size={{
              xs: 12,
              sm: viewMode === 'list' ? 12 : 6,
              md: viewMode === 'list' ? 12 : 4,
              lg: viewMode === 'list' ? 12 : 3
            }}
            key={product.id}
          >
            <ProductCard
              product={product}
              onAddToCart={addItem}
              variant={viewMode}
            />
          </Grid>
        ))}
      </Grid>

      {filteredProducts.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No products found matching your criteria.
          </Typography>
          <Button variant="outlined" onClick={() => {
            setSearchQuery('');
            setSortBy('featured');
          }}>
            Clear Filters
          </Button>
        </Box>
      )}
    </Box>
  );

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Grid container spacing={4}>
          {/* Filter Sidebar for Desktop */}
          {!isMobile && (
            <Grid size={{ xs: 12, md: 3 }}>
              <FilterPanel
                onFilterChange={handleFilterChange}
                categories={categories}
                brands={brands}
                sizes={sizes}
                colors={colors}
                maxPrice={maxPrice}
              />
            </Grid>
          )}
          
          {/* Main Content */}
          <Grid size={{ xs: 12, md: 9 }}>
            {mainContent}
          </Grid>
        </Grid>
      </Box>

      {/* Mobile Filter Drawer */}
      <Drawer
        anchor="left"
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        sx={{ '& .MuiDrawer-paper': { width: 300 } }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Filters</Typography>
          <IconButton onClick={() => setFilterDrawerOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
        <FilterPanel
          onFilterChange={(filters) => {
            handleFilterChange(filters);
            setFilterDrawerOpen(false);
          }}
          categories={categories}
          brands={brands}
          sizes={sizes}
          colors={colors}
          maxPrice={maxPrice}
        />
      </Drawer>

      {/* Mobile Filter Fab */}
      {isMobile && (
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => setFilterDrawerOpen(true)}
        >
          <FilterIcon />
        </Fab>
      )}
    </Container>
  );
};

export default Products;
