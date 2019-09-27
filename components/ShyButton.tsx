export const ShyButton = props => (
  <a
    {...props}
    href="#"
    style={{
      display: 'block',
      textDecoration: 'none',
      marginBottom: '1rem',
    }}
    onClick={e => {
      e.preventDefault();
      if (props.onClick) {
        props.onClick(e);
      }
    }}
  />
);
