import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProductsCategories } from '../api/registry';
import { api } from '../api/client';
import { Promotion } from '../api/promotions';

const PromotionFormSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido').max(200, 'Nombre muy largo'),
  discount_type: z.enum(['percentage', 'fixed'], { message: 'Tipo de descuento es requerido' }),
  discount_value: z.number().positive('Valor del descuento es requerido'),
  start_date: z.string().min(1, 'Fecha de inicio es requerida'),
  end_date: z.string().min(1, 'Fecha de fin es requerida'),
  product_ids: z.array(z.string()).optional(),
  category_ids: z.array(z.string()).optional(),
}).superRefine((data, ctx) => {
  if (data.discount_type === 'percentage') {
    if (data.discount_value < 0.01 || data.discount_value > 1.00) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Porcentaje debe estar entre 0.01 y 1.00',
        path: ['discount_value'],
      });
    }
  } else if (data.discount_type === 'fixed') {
    if (data.discount_value <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Monto fijo debe ser mayor a 0',
        path: ['discount_value'],
      });
    }
  }

  if (new Date(data.end_date) <= new Date(data.start_date)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Fecha de fin debe ser posterior a fecha de inicio',
      path: ['end_date'],
    });
  }

  if ((data.product_ids?.length ?? 0) + (data.category_ids?.length ?? 0) === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Al menos un producto o categoría es requerido',
      path: ['product_ids'],
    });
  }
});

type PromotionFormData = z.infer<typeof PromotionFormSchema>;

interface PromotionFormProps {
  initialData?: Partial<PromotionFormData>;
  onSuccess?: (promotion: Promotion) => void;
  onError?: (error: Error) => void;
}

export function PromotionForm({ initialData, onSuccess, onError }: PromotionFormProps) {
  const { data: registry, isLoading: registryLoading } = useProductsCategories();
  
  const products = registry?.products ?? [];
  const categories = registry?.categories ?? [];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<PromotionFormData>({
    resolver: zodResolver(PromotionFormSchema),
    defaultValues: {
      name: '',
      discount_type: 'percentage',
      discount_value: 0.15,
      start_date: '',
      end_date: '',
      product_ids: [],
      category_ids: [],
      ...initialData,
    },
    mode: 'onChange',
  });

  const discountType = watch('discount_type');

  const onSubmit = async (data: PromotionFormData) => {
    try {
      const payload = {
        name: data.name,
        discount_type: data.discount_type,
        discount_value: data.discount_type === 'percentage' ? data.discount_value : data.discount_value,
        start_date: new Date(data.start_date).toISOString(),
        end_date: new Date(data.end_date).toISOString(),
        product_ids: data.product_ids ?? [],
        category_ids: data.category_ids ?? [],
      };

      const promotion = await api.post<Promotion>('/promotions', payload);
      onSuccess?.(promotion);
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Error al crear promoción'));
    }
  };

  if (registryLoading) {
    return (
      <div className="promotion-form-loading" role="status" aria-label="Cargando formulario">
        <p>Cargando productos y categorías...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="promotion-form" noValidate>
      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="name" className="form-label">
            Nombre <span className="required" aria-hidden="true">*</span>
          </label>
          <input
            id="name"
            type="text"
            className={`form-input ${errors.name ? 'error' : ''}`}
            {...register('name')}
            placeholder="Nombre de la promoción"
            aria-describedby={errors.name ? 'name-error' : undefined}
            aria-invalid={!!errors.name}
          />
          {errors.name && (
            <p id="name-error" className="form-error" role="alert">{errors.name.message}</p>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="discount_type" className="form-label">
            Tipo de descuento <span className="required" aria-hidden="true">*</span>
          </label>
          <select
            id="discount_type"
            className={`form-select ${errors.discount_type ? 'error' : ''}`}
            {...register('discount_type')}
            aria-describedby={errors.discount_type ? 'discount-type-error' : undefined}
            aria-invalid={!!errors.discount_type}
          >
            <option value="">Seleccionar tipo</option>
            <option value="percentage">Porcentaje</option>
            <option value="fixed">Monto fijo</option>
          </select>
          {errors.discount_type && (
            <p id="discount-type-error" className="form-error" role="alert">{errors.discount_type.message}</p>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="discount_value" className="form-label">
            Valor del descuento <span className="required" aria-hidden="true">*</span>
          </label>
          <input
            id="discount_value"
            type="number"
            step={discountType === 'percentage' ? '0.01' : '1'}
            min={discountType === 'percentage' ? '0.01' : '1'}
            max={discountType === 'percentage' ? '1' : undefined}
            className={`form-input ${errors.discount_value ? 'error' : ''}`}
            {...register('discount_value', { valueAsNumber: true })}
            placeholder={discountType === 'percentage' ? 'Ej: 0.15 (15%)' : 'Ej: 500'}
            aria-describedby={errors.discount_value ? 'discount-value-error' : 'discount-value-hint'}
            aria-invalid={!!errors.discount_value}
          />
          <p id="discount-value-hint" className="form-hint">
            {discountType === 'percentage' 
              ? 'Ingrese un valor entre 0.01 y 1.00 (ej: 0.15 para 15%)'
              : 'Ingrese el monto fijo en pesos (ej: 500)'}
          </p>
          {errors.discount_value && (
            <p id="discount-value-error" className="form-error" role="alert">{errors.discount_value.message}</p>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="start_date" className="form-label">
            Fecha de inicio <span className="required" aria-hidden="true">*</span>
          </label>
          <input
            id="start_date"
            type="datetime-local"
            className={`form-input ${errors.start_date ? 'error' : ''}`}
            {...register('start_date')}
            aria-describedby={errors.start_date ? 'start-date-error' : undefined}
            aria-invalid={!!errors.start_date}
          />
          {errors.start_date && (
            <p id="start-date-error" className="form-error" role="alert">{errors.start_date.message}</p>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="end_date" className="form-label">
            Fecha de fin <span className="required" aria-hidden="true">*</span>
          </label>
          <input
            id="end_date"
            type="datetime-local"
            className={`form-input ${errors.end_date ? 'error' : ''}`}
            {...register('end_date')}
            aria-describedby={errors.end_date ? 'end-date-error' : undefined}
            aria-invalid={!!errors.end_date}
          />
          {errors.end_date && (
            <p id="end-date-error" className="form-error" role="alert">{errors.end_date.message}</p>
          )}
        </div>

        <div className="form-field full-width">
          <label className="form-label">
            Productos <span className="required" aria-hidden="true">*</span>
          </label>
          <div className="multi-select-wrapper">
            <select
              className={`form-select ${errors.product_ids ? 'error' : ''}`}
              {...register('product_ids')}
              multiple
              aria-describedby={errors.product_ids ? 'products-error' : 'products-hint'}
              aria-invalid={!!errors.product_ids}
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </select>
            <p id="products-hint" className="form-hint">Mantenga Ctrl/Cmd para seleccionar múltiples</p>
          </div>
        </div>

        <div className="form-field full-width">
          <label className="form-label">
            Categorías <span className="required" aria-hidden="true">*</span>
          </label>
          <div className="multi-select-wrapper">
            <select
              className={`form-select ${errors.category_ids ? 'error' : ''}`}
              {...register('category_ids')}
              multiple
              aria-describedby={errors.category_ids ? 'categories-error' : 'categories-hint'}
              aria-invalid={!!errors.category_ids}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <p id="categories-hint" className="form-hint">Mantenga Ctrl/Cmd para seleccionar múltiples</p>
          </div>
        </div>

        {(errors.product_ids || errors.category_ids) && (
          <p id="products-error" className="form-error full-width" role="alert">
            {errors.product_ids?.message || errors.category_ids?.message}
          </p>
        )}

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              // Reset form
              Object.keys(errors).forEach((key) => {
                // Form will be reset by parent or user action
              });
            }}
            disabled={isSubmitting}
          >
            Limpiar
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting || !isDirty}
          >
            {isSubmitting ? 'Creando...' : 'Crear promoción'}
          </button>
        </div>
      </div>
    </form>
  );
}