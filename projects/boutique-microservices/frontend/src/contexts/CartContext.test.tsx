import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CartProvider, useCart } from './CartContext';
import { Product } from '../types';

const mockProduct: Product = {
  id: 'prod-1',
  name: 'Luxury Watch',
  description: 'A fine timepiece',
  price: 250,
  imageUrl: '/watch.jpg',
  category: 'accessories',
  inventory: 10,
  rating: 4.8,
  reviewCount: 42,
  isNew: false,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

const TestConsumer: React.FC = () => {
  const { items, itemCount, total, addItem, removeItem, updateQuantity, clearCart } = useCart();

  return (
    <div>
      <span data-testid="item-count">{itemCount}</span>
      <span data-testid="total">{total.toFixed(2)}</span>
      <span data-testid="items-length">{items.length}</span>
      <button onClick={() => addItem(mockProduct)}>Add</button>
      <button onClick={() => removeItem('prod-1')}>Remove</button>
      <button onClick={() => updateQuantity('prod-1', 3)}>SetQty3</button>
      <button onClick={clearCart}>Clear</button>
    </div>
  );
};

const renderCart = () =>
  render(
    <CartProvider>
      <TestConsumer />
    </CartProvider>
  );

describe('CartContext', () => {
  it('starts with empty cart', () => {
    renderCart();
    expect(screen.getByTestId('item-count').textContent).toBe('0');
    expect(screen.getByTestId('total').textContent).toBe('0.00');
    expect(screen.getByTestId('items-length').textContent).toBe('0');
  });

  it('adds item to cart', () => {
    renderCart();
    fireEvent.click(screen.getByText('Add'));
    expect(screen.getByTestId('item-count').textContent).toBe('1');
    expect(screen.getByTestId('total').textContent).toBe('250.00');
  });

  it('increments quantity when same item added again', () => {
    renderCart();
    fireEvent.click(screen.getByText('Add'));
    fireEvent.click(screen.getByText('Add'));
    expect(screen.getByTestId('item-count').textContent).toBe('2');
    expect(screen.getByTestId('items-length').textContent).toBe('1');
    expect(screen.getByTestId('total').textContent).toBe('500.00');
  });

  it('removes item from cart', () => {
    renderCart();
    fireEvent.click(screen.getByText('Add'));
    fireEvent.click(screen.getByText('Remove'));
    expect(screen.getByTestId('item-count').textContent).toBe('0');
    expect(screen.getByTestId('items-length').textContent).toBe('0');
  });

  it('updates quantity of an item', () => {
    renderCart();
    fireEvent.click(screen.getByText('Add'));
    fireEvent.click(screen.getByText('SetQty3'));
    expect(screen.getByTestId('item-count').textContent).toBe('3');
    expect(screen.getByTestId('total').textContent).toBe('750.00');
  });

  it('clears all items', () => {
    renderCart();
    fireEvent.click(screen.getByText('Add'));
    fireEvent.click(screen.getByText('Add'));
    fireEvent.click(screen.getByText('Clear'));
    expect(screen.getByTestId('item-count').textContent).toBe('0');
    expect(screen.getByTestId('items-length').textContent).toBe('0');
  });
});
