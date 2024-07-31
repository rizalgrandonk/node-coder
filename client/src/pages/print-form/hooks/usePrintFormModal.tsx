import { useState } from "react";

type PersonelType = {
  id: string;
  nik: string;
  name: string;
};

type ProductType = {
  id: string;
  name: string;
  description: string;
};

export const usePrintFormModal = () => {
  const [personel, setPersonel] = useState<PersonelType | undefined>();
  const [product, setProduct] = useState<ProductType | undefined>();
  const [showPersonelModal, setShowPersonelModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);

  const lookupPersonelSubmitHandler = (personel: PersonelType) => {
    setPersonel(personel);
    setShowPersonelModal(false);
  };

  const lookupProductSubmitHandler = (product: ProductType) => {
    setProduct(product);
    setShowProductModal(false);
  };

  return {
    personel,
    product,
    showPersonelModal,
    showProductModal,
    setShowPersonelModal,
    setShowProductModal,
    lookupPersonelSubmitHandler,
    lookupProductSubmitHandler,
  };
};
