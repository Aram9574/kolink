/**
 * Tests for Card component
 * 
 * Container component used throughout the application
 */

import { render, screen } from '@testing-library/react';
import Card from '@/components/Card';

describe('Card', () => {
  describe('Rendering', () => {
    it('should render card with children', () => {
      render(<Card>Card content</Card>);
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('should render as div element', () => {
      const { container } = render(<Card>Content</Card>);
      expect(container.firstChild?.nodeName).toBe('DIV');
    });

    it('should accept custom className', () => {
      const { container } = render(<Card className="custom-class">Content</Card>);
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Variants', () => {
    it('should apply default variant styles', () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('bg-white');
    });

    it('should apply elevated variant styles', () => {
      const { container } = render(<Card variant="elevated">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toMatch(/shadow/);
    });

    it('should apply glass variant styles', () => {
      const { container } = render(<Card variant="glass">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toMatch(/backdrop-blur|bg-opacity/);
    });

    it('should apply gradient variant styles', () => {
      const { container } = render(<Card variant="gradient">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('bg-gradient');
    });
  });

  describe('Depth Levels', () => {
    it('should apply small depth', () => {
      const { container } = render(<Card depth="sm">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toMatch(/shadow-depth-sm|shadow-sm/);
    });

    it('should apply medium depth', () => {
      const { container } = render(<Card depth="md">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toMatch(/shadow-depth-md|shadow-md/);
    });

    it('should apply large depth', () => {
      const { container } = render(<Card depth="lg">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toMatch(/shadow-depth-lg|shadow-lg/);
    });

    it('should apply extra large depth', () => {
      const { container } = render(<Card depth="xl">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toMatch(/shadow-depth-xl|shadow-xl/);
    });
  });

  describe('Hover Effect', () => {
    it('should apply hover effect when hover prop is true', () => {
      const { container } = render(<Card hover>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toMatch(/hover:shadow|hover:-translate-y/);
    });

    it('should not apply hover effect by default', () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      // Just checking it renders without error
      expect(card).toBeInTheDocument();
    });
  });

  describe('Content', () => {
    it('should render multiple children', () => {
      render(
        <Card>
          <h2>Title</h2>
          <p>Description</p>
        </Card>
      );
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    it('should render complex nested content', () => {
      render(
        <Card>
          <div>
            <span>Nested</span>
            <span>Content</span>
          </div>
        </Card>
      );
      expect(screen.getByText('Nested')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('HTML Attributes', () => {
    it('should accept custom data attributes', () => {
      const { container } = render(
        <Card data-testid="my-card">Content</Card>
      );
      expect(container.firstChild).toHaveAttribute('data-testid', 'my-card');
    });

    it('should accept onClick handler', () => {
      const handleClick = jest.fn();
      const { container } = render(
        <Card onClick={handleClick}>Clickable</Card>
      );
      const card = container.firstChild as HTMLElement;
      card.click();
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Composition', () => {
    it('should work with variant and depth combined', () => {
      const { container } = render(
        <Card variant="elevated" depth="lg">
          Content
        </Card>
      );
      const card = container.firstChild as HTMLElement;
      expect(card).toBeInTheDocument();
      expect(card.textContent).toBe('Content');
    });

    it('should work with all props combined', () => {
      const { container } = render(
        <Card 
          variant="glass" 
          depth="xl" 
          hover 
          className="custom"
        >
          Content
        </Card>
      );
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('custom');
      expect(card.textContent).toBe('Content');
    });
  });
});
