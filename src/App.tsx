import { lazy, Suspense } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import { HomeSectionMenu } from './components/HomeSectionMenu';
import { PageLoading } from './components/PageLoading';
import { RouteErrorBoundary } from './components/RouteErrorBoundary';
import { MarketplacePage } from './pages/MarketplacePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RouteEffects } from './components/RouteEffects';
import { useLanguage } from './lib/i18n';

const AboutPage = lazy(() => import('./pages/AboutPage').then((page) => ({ default: page.AboutPage })));
const CartPage = lazy(() => import('./pages/CartPage').then((page) => ({ default: page.CartPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((page) => ({ default: page.ProfilePage })));
const ProductPage = lazy(() => import('./pages/ProductPage').then((page) => ({ default: page.ProductPage })));
const SellerPage = lazy(() => import('./pages/SellerPage').then((page) => ({ default: page.SellerPage })));
const ImportPage = lazy(() => import('./pages/ImportPage').then((page) => ({ default: page.ImportPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then((page) => ({ default: page.ResetPasswordPage })));

export default function App() {
  const { t } = useLanguage();
  const [location] = useLocation();
  return (
    <>
      <button className="skip-link" onClick={() => document.querySelector<HTMLElement>('main')?.focus()}>{t('skipToContent')}</button>
      <HomeSectionMenu />
      <RouteErrorBoundary key={location} message={t('pageLoadError')} retryLabel={t('retry')}>
        <Suspense fallback={<PageLoading />}>
          <RouteEffects />
          <Switch>
            <Route path="/" component={MarketplacePage} />
            <Route path="/market" component={MarketplacePage} />
            <Route path="/about" component={AboutPage} />
            <Route path="/cart" component={CartPage} />
            <Route path="/profile" component={ProfilePage} />
            <Route path="/seller" component={SellerPage} />
            <Route path="/seller/:section" component={SellerPage} />
            <Route path="/import" component={ImportPage} />
            <Route path="/reset-password" component={ResetPasswordPage} />
            <Route path="/product/:id" component={ProductPage} />
            <Route component={NotFoundPage} />
          </Switch>
        </Suspense>
      </RouteErrorBoundary>
    </>
  );
}
