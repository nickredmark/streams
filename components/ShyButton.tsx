export const ShyButton = props => (
  <a
    {...props}
    href="#"
    style={{
      display: 'block',
      margin: '0.5rem',
      textDecoration: 'none',
    }}
    onClick={e => {
      e.preventDefault();
      if (props.onClick) {
        props.onClick(e);
      }
    }}
  />
);
