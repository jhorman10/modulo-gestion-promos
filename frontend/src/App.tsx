import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryProvider } from './providers/QueryProvider';
import { Layout } from './components/layout/Layout';
import { PromotionListContainer } from './components/PromotionListContainer';
import { PromotionForm } from './components/PromotionForm';
import { PromotionSummary } from './components/PromotionSummary';
import { ToastProvider } from './components/ui/Toast';

function App() {
  return (
    <QueryProvider>
      <ToastProvider />
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/promotions" replace />} />
          <Route path="/promotions" element={<PromotionListContainer />} />
          <Route path="/promotions/new" element={<PromotionForm />} />
          <Route path="/promotions/:id/edit" element={<PromotionForm />} />
          <Route path="/summary" element={<PromotionSummary />} />
        </Routes>
      </Layout>
    </QueryProvider>
  );
}

export default App;
