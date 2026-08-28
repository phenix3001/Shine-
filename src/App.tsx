import { Route, Switch } from 'wouter';
import { HomeSectionMenu } from './components/HomeSectionMenu';
import { AboutPage } from './pages/AboutPage';
import { CartPage } from './pages/CartPage';
import { MarketplacePage } from './pages/MarketplacePage';
import { ProfilePage } from './pages/ProfilePage';
import { ProductPage } from './pages/ProductPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SellerPage } from './pages/SellerPage';

export default function App() {
  return (
    <>
      <HomeSectionMenu />
      <Switch>
        <Route path="/" component={MarketplacePage} />
        <Route path="/market" component={MarketplacePage} />
        <Route path="/about" component={AboutPage} />
        <Route path="/cart" component={CartPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/seller" component={SellerPage} />
        <Route path="/product/:id" component={ProductPage} />
        <Route component={NotFoundPage} />
      </Switch>
    </>
  );
}
