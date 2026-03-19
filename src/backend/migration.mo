import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Storage "blob-storage/Storage";

module {
  type VideoId = Nat;
  type CommentId = Nat;
  type ListingId = Nat;
  type CategoryId = Nat;
  type ThreadId = Nat;
  type ReplyId = Nat;
  type ShopId = Nat;
  type ShopProductId = Nat;

  type OldShopProduct = {
    id : ShopProductId;
    shopId : ShopId;
    title : Text;
    description : Text;
    price : Nat;
    imageBlobs : [Storage.ExternalBlob];
    currency : Text;
    paymentLink : Text;
    stock : Nat;
    isDigital : Bool;
    category : Text;
    timestamp : Int;
  };

  type OldShop = {
    id : Nat;
    name : Text;
    description : Text;
    rules : Text;
    contactInfo : Text;
    bannerBlob : ?Storage.ExternalBlob;
    logoBlob : ?Storage.ExternalBlob;
    isNsfw : Bool;
    categories : [Text];
    owner : Principal.Principal;
    timestamp : Int;
  };

  type OldActor = {
    shopProducts : Map.Map<ShopProductId, OldShopProduct>;
    shops : Map.Map<Nat, OldShop>;
  };

  type NewShopProduct = {
    id : ShopProductId;
    shopId : ShopId;
    title : Text;
    description : Text;
    price : Nat;
    imageBlobs : [Storage.ExternalBlob];
    digitalFileBlob : ?Storage.ExternalBlob;
    currency : Text;
    paymentLink : Text;
    stock : Nat;
    isDigital : Bool;
    category : Text;
    timestamp : Int;
  };

  type NewActor = {
    shopProducts : Map.Map<ShopProductId, NewShopProduct>;
    shops : Map.Map<Nat, OldShop>;
  };

  public func run(old : OldActor) : NewActor {
    let newShopProducts = old.shopProducts.map<ShopProductId, OldShopProduct, NewShopProduct>(
      func(_id, oldProduct) {
        { oldProduct with digitalFileBlob = null };
      }
    );
    { old with shopProducts = newShopProducts };
  };
};
