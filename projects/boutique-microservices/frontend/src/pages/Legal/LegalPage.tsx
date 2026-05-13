import React from 'react';
import { Container, Typography, Box, Paper, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';

interface LegalPageProps {
  type: 'terms' | 'privacy';
}

const CONTENT = {
  terms: {
    title: 'Terms and Conditions',
    sections: [
      { heading: 'Acceptance of Terms', body: 'By accessing and using Luxury Boutique, you accept and agree to be bound by these Terms and Conditions. If you do not agree, please do not use our services.' },
      { heading: 'Use of Services', body: 'You may use our services only for lawful purposes and in accordance with these Terms. You agree not to use the service in any way that violates applicable local, national, or international laws.' },
      { heading: 'Purchases and Payments', body: 'All purchases are subject to product availability. We reserve the right to refuse or cancel any order. Prices are subject to change without notice.' },
      { heading: 'Returns and Refunds', body: 'We offer a 30-day return policy for items in original condition. Refunds are processed within 5–10 business days once the returned item is received and inspected.' },
      { heading: 'Intellectual Property', body: 'All content on this site, including text, graphics, logos, and images, is the property of Luxury Boutique and protected by applicable intellectual property laws.' },
      { heading: 'Limitation of Liability', body: 'Luxury Boutique shall not be liable for any indirect, incidental, or consequential damages arising from your use of our services.' },
      { heading: 'Changes to Terms', body: 'We reserve the right to modify these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.' },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    sections: [
      { heading: 'Information We Collect', body: 'We collect information you provide directly, including your name, email address, shipping address, and payment information when you make a purchase or create an account.' },
      { heading: 'How We Use Your Information', body: 'We use your information to process transactions, send order confirmations, provide customer support, and improve our services. We do not sell your personal information to third parties.' },
      { heading: 'Data Storage and Security', body: 'Your data is stored securely and we implement appropriate technical and organisational measures to protect it against unauthorised access, loss, or disclosure.' },
      { heading: 'Cookies', body: 'We use cookies to enhance your browsing experience, analyse site traffic, and personalise content. You can control cookie settings through your browser.' },
      { heading: 'Your Rights', body: 'You have the right to access, correct, or delete your personal data at any time. To exercise these rights, please contact us through your account settings or our support channel.' },
      { heading: 'Third-Party Services', body: 'We may use third-party services (e.g., payment processors) that have their own privacy policies. We are not responsible for the practices of these third parties.' },
      { heading: 'Contact Us', body: 'If you have any questions about this Privacy Policy, please contact us at privacy@luxuryboutique.com.' },
    ],
  },
};

const LegalPage: React.FC<LegalPageProps> = ({ type }) => {
  const navigate = useNavigate();
  const { title, sections } = CONTENT[type];

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mb: 3 }}
        >
          Back
        </Button>

        <Paper elevation={2} sx={{ p: { xs: 3, md: 5 } }}>
          <Typography variant="h3" component="h1" gutterBottom>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </Typography>

          {sections.map((section, index) => (
            <Box key={index} sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom>
                {section.heading}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {section.body}
              </Typography>
            </Box>
          ))}
        </Paper>
      </Box>
    </Container>
  );
};

export default LegalPage;
