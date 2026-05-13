import React, { useState } from 'react';
import { Outlet, Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Badge,
  Button,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Container,
  Stack,
} from '@mui/material';
import {
  ShoppingCart,
  AccountCircle,
  Menu as MenuIcon,
  Close as CloseIcon,
  Instagram,
  Pinterest,
  Twitter,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Shop', to: '/products' },
  { label: 'Orders', to: '/orders', authRequired: true },
];

const Layout: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();
  const { itemCount } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const navLinks = NAV_LINKS.filter((l) => !l.authRequired || isAuthenticated);

  const mobileDrawer = (
    <Box sx={{ width: 280, pt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, pb: 2 }}>
        <Typography variant="h6" sx={{ fontFamily: '"Playfair Display", serif', letterSpacing: 2 }}>
          LUXE
        </Typography>
        <IconButton onClick={() => setMobileOpen(false)}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider />
      <List>
        {navLinks.map((link) => (
          <ListItem
            key={link.to}
            component={RouterLink}
            to={link.to}
            onClick={() => setMobileOpen(false)}
            sx={{ py: 1.5, color: isActive(link.to) ? '#d4af37' : 'text.primary' }}
          >
            <ListItemText primary={link.label} />
          </ListItem>
        ))}
        {isAuthenticated ? (
          <>
            <ListItem
              component={RouterLink}
              to="/profile"
              onClick={() => setMobileOpen(false)}
              sx={{ py: 1.5, color: 'text.primary' }}
            >
              <ListItemText primary="Profile" />
            </ListItem>
            <ListItem
              onClick={() => { logout(); setMobileOpen(false); }}
              sx={{ py: 1.5, color: 'text.secondary', cursor: 'pointer' }}
            >
              <ListItemText primary="Sign Out" />
            </ListItem>
          </>
        ) : (
          <ListItem
            component={RouterLink}
            to="/login"
            onClick={() => setMobileOpen(false)}
            sx={{ py: 1.5, color: 'text.primary' }}
          >
            <ListItemText primary="Sign In" />
          </ListItem>
        )}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Top announcement bar */}
      <Box sx={{ backgroundColor: '#1a1a1a', color: '#d4af37', textAlign: 'center', py: 0.75, fontSize: '0.8rem', letterSpacing: 1 }}>
        FREE SHIPPING ON ORDERS OVER $500 &nbsp;·&nbsp; FREE RETURNS WITHIN 30 DAYS
      </Box>

      <AppBar position="sticky" elevation={0} sx={{ backgroundColor: 'white', borderBottom: '1px solid rgba(0,0,0,0.08)', color: 'text.primary' }}>
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ height: 72 }}>
            {/* Mobile hamburger */}
            <IconButton
              edge="start"
              onClick={() => setMobileOpen(true)}
              sx={{ mr: 1, display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>

            {/* Logo */}
            <Typography
              variant="h5"
              component={RouterLink}
              to="/"
              sx={{
                fontFamily: '"Playfair Display", serif',
                letterSpacing: 3,
                textDecoration: 'none',
                color: '#1a1a1a',
                fontWeight: 700,
                flexGrow: { xs: 1, md: 0 },
                mr: { md: 6 },
              }}
            >
              LUXE BOUTIQUE
            </Typography>

            {/* Desktop nav links */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, flexGrow: 1 }}>
              {navLinks.map((link) => (
                <Button
                  key={link.to}
                  component={RouterLink}
                  to={link.to}
                  sx={{
                    color: isActive(link.to) ? '#d4af37' : '#1a1a1a',
                    fontWeight: isActive(link.to) ? 700 : 400,
                    letterSpacing: 1,
                    fontSize: '0.875rem',
                    '&:after': isActive(link.to)
                      ? {
                          content: '""',
                          display: 'block',
                          height: 2,
                          backgroundColor: '#d4af37',
                          position: 'absolute',
                          bottom: 8,
                          left: 8,
                          right: 8,
                        }
                      : {},
                    position: 'relative',
                  }}
                >
                  {link.label}
                </Button>
              ))}
            </Box>

            {/* Right actions */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <IconButton onClick={() => navigate('/cart')} sx={{ color: '#1a1a1a' }}>
                <Badge badgeContent={itemCount} color="error">
                  <ShoppingCart />
                </Badge>
              </IconButton>
              {isAuthenticated ? (
                <>
                  <IconButton onClick={() => navigate('/profile')} sx={{ color: '#1a1a1a', display: { xs: 'none', md: 'flex' } }}>
                    <AccountCircle />
                  </IconButton>
                  <Button
                    onClick={logout}
                    size="small"
                    sx={{ color: 'text.secondary', display: { xs: 'none', md: 'flex' }, fontSize: '0.8rem' }}
                  >
                    Sign Out
                  </Button>
                </>
              ) : (
                <Button
                  component={RouterLink}
                  to="/login"
                  variant="outlined"
                  size="small"
                  sx={{ ml: 1, display: { xs: 'none', md: 'flex' }, borderColor: '#1a1a1a', color: '#1a1a1a', '&:hover': { borderColor: '#d4af37', color: '#d4af37' } }}
                >
                  Sign In
                </Button>
              )}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      <Drawer anchor="left" open={mobileOpen} onClose={() => setMobileOpen(false)}>
        {mobileDrawer}
      </Drawer>

      {/* Page content */}
      <Box component="main" sx={{ flexGrow: 1 }}>
        <Outlet />
      </Box>

      {/* Footer */}
      <Box component="footer" sx={{ backgroundColor: '#1a1a1a', color: 'rgba(255,255,255,0.7)', pt: 6, pb: 3, mt: 'auto' }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '2fr 1fr 1fr 1fr' }, gap: 4, mb: 4 }}>
            {/* Brand */}
            <Box>
              <Typography variant="h5" sx={{ fontFamily: '"Playfair Display", serif', color: 'white', letterSpacing: 3, mb: 2 }}>
                LUXE BOUTIQUE
              </Typography>
              <Typography variant="body2" sx={{ lineHeight: 1.8, mb: 2 }}>
                A curated edit of luxury fashion, accessories, and lifestyle pieces for the modern wardrobe.
              </Typography>
              <Stack direction="row" spacing={1}>
                <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#d4af37' } }}>
                  <Instagram fontSize="small" />
                </IconButton>
                <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#d4af37' } }}>
                  <Pinterest fontSize="small" />
                </IconButton>
                <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#d4af37' } }}>
                  <Twitter fontSize="small" />
                </IconButton>
              </Stack>
            </Box>

            {/* Shop */}
            <Box>
              <Typography variant="subtitle2" sx={{ color: 'white', letterSpacing: 2, mb: 2, textTransform: 'uppercase', fontSize: '0.75rem' }}>
                Shop
              </Typography>
              {['Women', 'Men', 'Accessories', 'Bags', 'Shoes', 'Jewelry'].map((cat) => (
                <Box key={cat} sx={{ mb: 1 }}>
                  <RouterLink
                    to={`/products?category=${cat}`}
                    style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '0.875rem' }}
                  >
                    {cat}
                  </RouterLink>
                </Box>
              ))}
            </Box>

            {/* Help */}
            <Box>
              <Typography variant="subtitle2" sx={{ color: 'white', letterSpacing: 2, mb: 2, textTransform: 'uppercase', fontSize: '0.75rem' }}>
                Help
              </Typography>
              {[
                { label: 'Orders', to: '/orders' },
                { label: 'Terms & Conditions', to: '/terms' },
                { label: 'Privacy Policy', to: '/privacy' },
              ].map((item) => (
                <Box key={item.label} sx={{ mb: 1 }}>
                  <RouterLink
                    to={item.to}
                    style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '0.875rem' }}
                  >
                    {item.label}
                  </RouterLink>
                </Box>
              ))}
            </Box>

            {/* Contact */}
            <Box>
              <Typography variant="subtitle2" sx={{ color: 'white', letterSpacing: 2, mb: 2, textTransform: 'uppercase', fontSize: '0.75rem' }}>
                Contact
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>support@luxeboutique.com</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>Mon – Fri · 9am – 6pm</Typography>
              <Typography variant="body2">Free returns · 30 days</Typography>
            </Box>
          </Box>

          <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 3 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="caption">© {new Date().getFullYear()} Luxe Boutique. All rights reserved.</Typography>
            <Typography variant="caption" sx={{ color: '#d4af37' }}>Crafted with care for the modern wardrobe</Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default Layout;
