import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { AppBar, Box, Button, Container, Toolbar, Typography } from '@mui/material';
import CartePage from '../modules/cartographie/pages/CartePage';
import DashboardPage from '../modules/dashboard/pages/DashboardPage';
import AlertesPage from '../modules/alertes/pages/AlertesPage';

export default function App() {
  return (
    <BrowserRouter>
      <AppBar position="static"><Toolbar><Typography variant="h6" sx={{ flexGrow: 1 }}>Géodécisionnel Madagascar</Typography><Button color="inherit" component={Link} to="/">Dashboard</Button><Button color="inherit" component={Link} to="/carte">Carte</Button><Button color="inherit" component={Link} to="/alertes">Alertes</Button></Toolbar></AppBar>
      <Container sx={{ py: 3 }}><Routes><Route path="/" element={<DashboardPage />} /><Route path="/carte" element={<CartePage />} /><Route path="/alertes" element={<AlertesPage />} /></Routes></Container>
    </BrowserRouter>
  );
}
