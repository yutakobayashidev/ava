## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_terraform"></a> [terraform](#requirement\_terraform) | >= 1.13.5 |
| <a name="requirement_stripe"></a> [stripe](#requirement\_stripe) | ~> 1.0 |

## Providers

| Name | Version |
|------|---------|
| <a name="provider_stripe"></a> [stripe](#provider\_stripe) | ~> 1.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [stripe_price.price](https://registry.terraform.io/providers/lukasaron/stripe/latest/docs/resources/price) | resource |
| [stripe_product.product](https://registry.terraform.io/providers/lukasaron/stripe/latest/docs/resources/product) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_price_currency"></a> [price\_currency](#input\_price\_currency) | Currency for the Stripe price | `string` | `"jpy"` | no |
| <a name="input_price_interval"></a> [price\_interval](#input\_price\_interval) | Recurring interval for the Stripe price | `string` | `"month"` | no |
| <a name="input_price_interval_count"></a> [price\_interval\_count](#input\_price\_interval\_count) | Number of intervals between recurring payments | `number` | `1` | no |
| <a name="input_price_lookup_key"></a> [price\_lookup\_key](#input\_price\_lookup\_key) | Lookup key for the Stripe price | `string` | `"basic_monthly"` | no |
| <a name="input_price_unit_amount"></a> [price\_unit\_amount](#input\_price\_unit\_amount) | Unit amount for the Stripe price (in the smallest currency unit) | `number` | `500` | no |
| <a name="input_product_active"></a> [product\_active](#input\_product\_active) | Whether the Stripe product is active | `bool` | `true` | no |
| <a name="input_product_description"></a> [product\_description](#input\_product\_description) | Stripe product description | `string` | `"Basic subscription plan"` | no |
| <a name="input_product_name"></a> [product\_name](#input\_product\_name) | Stripe product name | `string` | `"Basic Plan"` | no |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_price_id"></a> [price\_id](#output\_price\_id) | Stripe Price ID |
| <a name="output_product_id"></a> [product\_id](#output\_product\_id) | Stripe Product ID |
